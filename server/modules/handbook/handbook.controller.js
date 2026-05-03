const HandbookCourse  = require('../../models/HandbookCourse');
const catchAsync      = require('../../utils/catchAsync');
const AppError        = require('../../utils/AppError');
const { sendSuccess } = require('../../utils/apiResponse');
const { uploadToCloudinary } = require('../../utils/cloudinaryUpload');

// CRITICAL: must use pdf-parse@1.1.1
// Run: cd server && npm install pdf-parse@1.1.1
const extractTextFromPDF = async (buffer) => {
  try {
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(buffer);
    return data.text || '';
  } catch (err) {
    console.error('pdf-parse failed:', err.message);
    console.error('Fix: cd server && npm install pdf-parse@1.1.1');
    return '';
  }
};

const parseCoursesFromText = (rawText) => {
  const courses = [];
  const seen    = new Set();
  const text    = rawText.replace(/\r/g, '').replace(/[ \t]{2,}/g, ' ');
  const lines   = text.split('\n').map(l => l.trim()).filter(Boolean);

  const sessionMatch    = rawText.match(/\b(20\d{2}\/20\d{2})\b/);
  const academicSession = sessionMatch ? sessionMatch[1] : '';

  let currentLevel    = '';
  let currentSemester = 'first';

  for (const line of lines) {
    if (/^Code\s+Title/i.test(line)) continue;
    if (/^Title\s+U/i.test(line))    continue;

    const lvlMatch = line.match(/\b(\d{3})\s+LEVEL/i);
    if (lvlMatch) {
      currentLevel = lvlMatch[1];
      if (/HAMM?AT+AN/i.test(line)) currentSemester = 'first';
      if (/\bRAIN\b/i.test(line))   currentSemester = 'second';
      continue;
    }
    if (/HAMM?AT+AN/i.test(line)) { currentSemester = 'first';  continue; }
    if (/\bRAIN\b/i.test(line))   { currentSemester = 'second'; continue; }

    // LASU format: "CSC 111 Introduction to Computer Science 3 C"
    const m = line.match(/^([A-Z]{2,4})\s+(\d{3}[A-Z]?)\s+(.+?)\s+(\d{1,2})\s+([CER]|\*\*?)\s*$/);
    if (m) {
      const [, dept, num, title, units, status] = m;
      const code = dept + num;
      const key  = `${code}-${currentSemester}`;
      if (/non-computer|arts.*social|management sci/i.test(title)) continue;
      if (status === '**') continue;
      if (!seen.has(key)) {
        seen.add(key);
        courses.push({
          code, title: title.trim(), units: parseInt(units),
          semester: currentSemester,
          level:    currentLevel || guessLevel(num),
          isElective:  ['E','R'].includes(status.toUpperCase()),
          isConfirmed: false,
        });
      }
    }
  }
  return { courses, academicSession };
};

const guessLevel = (num) => {
  const n = parseInt(num);
  if (n < 200) return '100';
  if (n < 300) return '200';
  if (n < 400) return '300';
  if (n < 500) return '400';
  return '500';
};

const extractWithAI = async (pdfText) => {
  try {
    if (!process.env.ANTHROPIC_API_KEY) return null;
    const Anthropic = require('@anthropic-ai/sdk');
    const client    = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response  = await client.messages.create({
      model: 'claude-sonnet-4-6', max_tokens: 3000,
      messages: [{ role: 'user', content: `Extract all courses from this Nigerian university handbook. Return ONLY valid JSON no markdown:\n{"academicSession":"","courses":[{"code":"CSC111","title":"Introduction to Computer Science","units":3,"semester":"first","level":"100","isElective":false}]}\nText:\n${pdfText.slice(0, 8000)}` }],
    });
    const clean = response.content[0]?.text?.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch (err) { console.error('AI fallback error:', err.message); return null; }
};

exports.uploadHandbook = catchAsync(async (req, res, next) => {
  if (!req.file) return next(new AppError('Please upload a PDF file.', 400));
  if (req.file.mimetype !== 'application/pdf') return next(new AppError('Only PDF files accepted.', 400));
  if (req.file.size > 20 * 1024 * 1024) return next(new AppError('PDF must be under 20MB.', 400));

  const uploaded = await uploadToCloudinary(req.file.buffer, {
    folder: 'lasuconnect/handbooks', resource_type: 'raw', format: 'pdf',
  });

  const pdfText = await extractTextFromPDF(req.file.buffer);
  console.log(`PDF chars: ${pdfText.length}`);

  let extracted = { courses: [], academicSession: '' };
  if (pdfText.length > 50) {
    extracted = parseCoursesFromText(pdfText);
    console.log(`Regex found: ${extracted.courses.length}`);
  }
  if (extracted.courses.length < 3 && pdfText.length > 50) {
    const ai = await extractWithAI(pdfText);
    if (ai?.courses?.length > 0) { extracted = ai; console.log(`AI found: ${extracted.courses.length}`); }
  }

  const handbook = await HandbookCourse.findOneAndUpdate(
    { student: req.user._id },
    { handbookUrl: uploaded.secure_url, handbookName: req.file.originalname, academicSession: extracted.academicSession || '', courses: extracted.courses, extractedAt: new Date(), confirmedAt: null, isConfirmed: false },
    { upsert: true, new: true }
  );

  sendSuccess(res, {
    statusCode: 201,
    message: extracted.courses.length > 0
      ? `Extracted ${handbook.courses.length} courses. Review and confirm below.`
      : 'Uploaded but no courses found automatically. Add them manually with the + button.',
    data: { handbook },
  });
});

exports.getHandbook = catchAsync(async (req, res, next) => {
  const handbook = await HandbookCourse.findOne({ student: req.user._id });
  sendSuccess(res, { data: { handbook: handbook || null } });
});

exports.confirmCourses = catchAsync(async (req, res, next) => {
  const { courses, academicSession } = req.body;
  if (!Array.isArray(courses) || courses.length === 0)
    return next(new AppError('At least one course is required.', 400));
  const handbook = await HandbookCourse.findOneAndUpdate(
    { student: req.user._id },
    { courses: courses.map(c => ({ ...c, isConfirmed: true })), academicSession: academicSession || '', isConfirmed: true, confirmedAt: new Date() },
    { new: true }
  );
  if (!handbook) return next(new AppError('Upload a handbook first.', 404));
  sendSuccess(res, { message: `${courses.length} courses confirmed! Daily quiz is now active.`, data: { handbook } });
});

exports.addCourse = catchAsync(async (req, res, next) => {
  const { code, title, units, semester, level, isElective } = req.body;
  if (!code?.trim() || !title?.trim()) return next(new AppError('Code and title are required.', 400));
  let handbook = await HandbookCourse.findOne({ student: req.user._id });
  if (!handbook) handbook = await HandbookCourse.create({ student: req.user._id, courses: [] });
  handbook.courses.push({ code: code.trim().toUpperCase().replace(/\s+/g,''), title: title.trim(), units: parseInt(units)||2, semester: semester||'first', level: level||'100', isElective: isElective===true||isElective==='true', isConfirmed: false });
  await handbook.save();
  sendSuccess(res, { statusCode: 201, data: { handbook } });
});

exports.updateCourse = catchAsync(async (req, res, next) => {
  const handbook = await HandbookCourse.findOne({ student: req.user._id });
  if (!handbook) return next(new AppError('Handbook not found.', 404));
  const i = parseInt(req.params.index);
  if (i < 0 || i >= handbook.courses.length) return next(new AppError('Index out of range.', 400));
  Object.assign(handbook.courses[i], req.body);
  await handbook.save();
  sendSuccess(res, { data: { handbook } });
});

exports.deleteCourse = catchAsync(async (req, res, next) => {
  const handbook = await HandbookCourse.findOne({ student: req.user._id });
  if (!handbook) return next(new AppError('Handbook not found.', 404));
  handbook.courses.splice(parseInt(req.params.index), 1);
  await handbook.save();
  sendSuccess(res, { message: 'Course removed.', data: { handbook } });
});
