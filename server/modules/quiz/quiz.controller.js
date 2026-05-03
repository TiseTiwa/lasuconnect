const { QuizQuestion, DailyQuiz, Streak } = require('../../models/Quiz');
const HandbookCourse  = require('../../models/HandbookCourse');
const catchAsync      = require('../../utils/catchAsync');
const AppError        = require('../../utils/AppError');
const { sendSuccess } = require('../../utils/apiResponse');

// ── Helpers ───────────────────────────────────────────────
const todayStr = () => new Date().toISOString().slice(0, 10);

const yesterdayStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
};

// ── AI question generation (lazy init — no crash if key missing) ──
const generateAIQuestions = async (courseCode, courseTitle, count = 2) => {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.log('No ANTHROPIC_API_KEY — skipping AI generation');
      return [];
    }
    // Lazy require so module loads fine without the key
    const Anthropic = require('@anthropic-ai/sdk');
    const client    = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `Generate ${count} multiple-choice quiz questions for a Nigerian university undergraduate course.
Course: ${courseTitle} (${courseCode})

Return ONLY valid JSON, no markdown:
{"questions":[{"question":"What is ...","options":["A","B","C","D"],"correctIndex":0,"explanation":"Brief reason","difficulty":"medium"}]}

Rules: 4 options, correctIndex 0-3, Nigerian university context, factual and clear.`,
      }],
    });

    const text  = response.content[0]?.text || '';
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean).questions || [];
  } catch (err) {
    console.error('AI question error:', err.message);
    return [];
  }
};

// ── Fallback question bank (generic CS/university questions) ──
const getFallbackQuestion = (courseCode, courseTitle) => {
  const dept = courseCode.replace(/\d+/g, '').toUpperCase();

  const generic = {
    CSC: [
      { question: `Which of the following best describes the primary function of an operating system in computer science?`, options: ['Managing hardware and software resources', 'Writing application code', 'Designing user interfaces', 'Storing data in databases'], correctIndex: 0, explanation: 'An OS manages hardware/software resources and provides services for programs.', difficulty: 'easy' },
      { question: `What does the acronym "SQL" stand for in database management?`, options: ['Structured Query Language', 'Simple Question Logic', 'Sequential Queue Language', 'Standard Query Library'], correctIndex: 0, explanation: 'SQL stands for Structured Query Language, used to manage relational databases.', difficulty: 'easy' },
      { question: `In object-oriented programming, what is "inheritance"?`, options: ['A class acquiring properties of another class', 'Hiding internal implementation details', 'Defining multiple methods with the same name', 'Converting data between types'], correctIndex: 0, explanation: 'Inheritance allows a class to derive properties and behaviours from a parent class.', difficulty: 'medium' },
      { question: `What is the time complexity of binary search on a sorted array?`, options: ['O(log n)', 'O(n)', 'O(n²)', 'O(1)'], correctIndex: 0, explanation: 'Binary search halves the search space each step, giving O(log n) complexity.', difficulty: 'medium' },
      { question: `Which data structure operates on a Last-In-First-Out (LIFO) principle?`, options: ['Stack', 'Queue', 'Linked List', 'Tree'], correctIndex: 0, explanation: 'A stack uses LIFO — the last element added is the first one removed.', difficulty: 'easy' },
    ],
    MAT: [
      { question: `What is the derivative of sin(x)?`, options: ['cos(x)', '-cos(x)', 'tan(x)', '-sin(x)'], correctIndex: 0, explanation: 'The derivative of sin(x) is cos(x).', difficulty: 'easy' },
      { question: `Which of these is a prime number?`, options: ['17', '15', '21', '25'], correctIndex: 0, explanation: '17 is prime; 15=3×5, 21=3×7, 25=5×5.', difficulty: 'easy' },
    ],
    PHY: [
      { question: `What is Newton's second law of motion?`, options: ['F = ma', 'F = mv', 'E = mc²', 'v = u + at'], correctIndex: 0, explanation: 'Force equals mass times acceleration (F = ma).', difficulty: 'easy' },
    ],
    GNS: [
      { question: `What does "plagiarism" mean in academic writing?`, options: ['Using someone else\'s work without credit', 'Citing too many sources', 'Writing in passive voice', 'Using long sentences'], correctIndex: 0, explanation: 'Plagiarism is presenting someone else\'s work or ideas as your own without proper attribution.', difficulty: 'easy' },
    ],
    ENT: [
      { question: `What is the primary goal of entrepreneurship?`, options: ['Creating value through innovation and risk-taking', 'Maximising government revenue', 'Minimising employee salaries', 'Avoiding market competition'], correctIndex: 0, explanation: 'Entrepreneurship involves creating economic and social value through innovation.', difficulty: 'easy' },
    ],
  };

  const pool = generic[dept] || [
    { question: `Which of the following best describes the study of ${courseTitle}?`, options: ['A systematic field with defined principles', 'An informal collection of opinions', 'A purely practical skill with no theory', 'An ancient discipline with no modern relevance'], correctIndex: 0, explanation: `${courseTitle} is a structured academic discipline with established principles and methodologies.`, difficulty: 'easy' },
  ];

  return pool[Math.floor(Math.random() * pool.length)];
};

// ── Core: get or create today's quiz ─────────────────────
const getOrCreateDailyQuiz = async (studentId) => {
  const today = todayStr();

  // Return existing if already generated today
  const existing = await DailyQuiz.findOne({ student: studentId, date: today })
    .populate('questions.question');
  if (existing) return existing;

  // Get handbook — must be confirmed at handbook level
  const handbook = await HandbookCourse.findOne({ student: studentId, isConfirmed: true });
  if (!handbook || handbook.courses.length === 0) {
    console.log('No confirmed handbook for student:', studentId);
    return null;
  }

  // Use ALL courses in the handbook (individual isConfirmed may not be set)
  const allCourses = handbook.courses;
  if (allCourses.length === 0) return null;

  console.log(`Building quiz from ${allCourses.length} courses`);

  // Pick up to 5 random courses for today
  const shuffled    = [...allCourses].sort(() => Math.random() - 0.5);
  const todayCourses = shuffled.slice(0, Math.min(5, shuffled.length));

  const quizItems = [];

  for (const course of todayCourses) {
    // 1 — Try predefined DB question for this course
    let question = null;
    const dbCount = await QuizQuestion.countDocuments({ courseCode: course.code, isActive: true });

    if (dbCount > 0) {
      const skip = Math.floor(Math.random() * dbCount);
      question = await QuizQuestion.findOne({ courseCode: course.code, isActive: true }).skip(skip);
    }

    // 2 — Try AI generation
    if (!question) {
      const aiQs = await generateAIQuestions(course.code, course.title, 1);
      if (aiQs.length > 0) {
        const q = aiQs[0];
        question = await QuizQuestion.create({
          courseCode:   course.code,
          courseTitle:  course.title,
          question:     q.question,
          options:      q.options,
          correctIndex: q.correctIndex,
          explanation:  q.explanation || '',
          difficulty:   q.difficulty  || 'medium',
          source:       'ai',
        });
      }
    }

    // 3 — Guaranteed fallback — always produces a question
    if (!question) {
      const fb = getFallbackQuestion(course.code, course.title);
      question = await QuizQuestion.create({
        courseCode:   course.code,
        courseTitle:  course.title,
        question:     fb.question,
        options:      fb.options,
        correctIndex: fb.correctIndex,
        explanation:  fb.explanation,
        difficulty:   fb.difficulty,
        source:       'predefined',
      });
    }

    quizItems.push({
      question:    question._id,
      courseCode:  course.code,
      courseTitle: course.title,
    });
  }

  if (quizItems.length === 0) return null;

  const quiz = await DailyQuiz.create({
    student:        studentId,
    date:           today,
    questions:      quizItems,
    totalQuestions: quizItems.length,
    status:         'pending',
  });

  return DailyQuiz.findById(quiz._id).populate('questions.question');
};

// ── Streak update ─────────────────────────────────────────
const updateStreak = async (studentId, score) => {
  const today     = todayStr();
  const yesterday = yesterdayStr();

  let streak = await Streak.findOne({ student: studentId });
  if (!streak) streak = await Streak.create({ student: studentId });

  // Don't double-count
  if (streak.lastCompletedDate === today) return streak;

  const newStreak = streak.lastCompletedDate === yesterday
    ? streak.currentStreak + 1
    : 1;

  const history = [...(streak.history || [])].slice(-29);
  history.push({ date: today, completed: true, score });

  streak.currentStreak     = newStreak;
  streak.longestStreak     = Math.max(streak.longestStreak, newStreak);
  streak.lastCompletedDate = today;
  streak.totalQuizzesDone += 1;
  streak.history           = history;
  await streak.save();
  return streak;
};

// ═══════════════════════════════════════════════════════════
//  GET /api/quiz/today
// ═══════════════════════════════════════════════════════════
exports.getTodayQuiz = catchAsync(async (req, res, next) => {
  const quiz = await getOrCreateDailyQuiz(req.user._id);

  if (!quiz) {
    return sendSuccess(res, {
      data: { quiz: null, reason: 'no_handbook' },
      message: 'Confirm your handbook first to activate daily quizzes.',
    });
  }

  // Strip correct answers from unanswered questions
  const sanitized = {
    _id:            quiz._id,
    date:           quiz.date,
    status:         quiz.status,
    totalQuestions: quiz.totalQuestions,
    answeredCount:  quiz.answeredCount,
    correctCount:   quiz.correctCount,
    score:          quiz.score,
    socialUnlocked: quiz.socialUnlocked,
    completedAt:    quiz.completedAt,
    questions: quiz.questions.map((q, i) => ({
      index:         i,
      courseCode:    q.courseCode,
      courseTitle:   q.courseTitle,
      question:      q.question?.question,
      options:       q.question?.options,
      difficulty:    q.question?.difficulty,
      answeredIndex: q.answeredIndex ?? null,
      isCorrect:     q.answeredIndex !== null ? q.isCorrect : null,
      correctIndex:  q.answeredIndex !== null ? q.question?.correctIndex : undefined,
      explanation:   q.answeredIndex !== null ? q.question?.explanation  : undefined,
    })),
  };

  sendSuccess(res, { data: { quiz: sanitized } });
});

// ═══════════════════════════════════════════════════════════
//  POST /api/quiz/answer
// ═══════════════════════════════════════════════════════════
exports.submitAnswer = catchAsync(async (req, res, next) => {
  const { questionIndex, answerIndex } = req.body;
  if (answerIndex === undefined || questionIndex === undefined)
    return next(new AppError('questionIndex and answerIndex are required.', 400));

  const today = todayStr();
  const quiz  = await DailyQuiz.findOne({ student: req.user._id, date: today })
    .populate('questions.question');

  if (!quiz)                    return next(new AppError('No quiz found for today.', 404));
  if (quiz.status === 'completed') return next(new AppError("Today's quiz is already completed.", 400));

  const item = quiz.questions[questionIndex];
  if (!item)                    return next(new AppError('Question not found.', 404));
  if (item.answeredIndex !== null) return next(new AppError('Already answered.', 400));

  const isCorrect        = item.question.correctIndex === answerIndex;
  item.answeredIndex     = answerIndex;
  item.isCorrect         = isCorrect;
  item.answeredAt        = new Date();
  quiz.answeredCount    += 1;
  if (isCorrect) quiz.correctCount += 1;
  if (quiz.status === 'pending') quiz.status = 'in_progress';

  let streak = null;
  if (quiz.answeredCount >= quiz.totalQuestions) {
    quiz.status         = 'completed';
    quiz.completedAt    = new Date();
    quiz.score          = Math.round((quiz.correctCount / quiz.totalQuestions) * 100);
    quiz.socialUnlocked = true;
    streak = await updateStreak(req.user._id, quiz.score);
  }

  await quiz.save();

  sendSuccess(res, {
    data: {
      isCorrect,
      correctIndex:   item.question.correctIndex,
      explanation:    item.question.explanation,
      score:          quiz.score,
      status:         quiz.status,
      socialUnlocked: quiz.socialUnlocked,
      answeredCount:  quiz.answeredCount,
      totalQuestions: quiz.totalQuestions,
      streak:         streak ? { currentStreak: streak.currentStreak, longestStreak: streak.longestStreak } : null,
    },
  });
});

// ═══════════════════════════════════════════════════════════
//  GET /api/quiz/streak
// ═══════════════════════════════════════════════════════════
exports.getStreak = catchAsync(async (req, res, next) => {
  let streak = await Streak.findOne({ student: req.user._id });
  if (!streak) streak = { currentStreak: 0, longestStreak: 0, totalQuizzesDone: 0, history: [] };
  sendSuccess(res, { data: { streak } });
});

// ═══════════════════════════════════════════════════════════
//  GET /api/quiz/feed-gate
// ═══════════════════════════════════════════════════════════
exports.getFeedGate = catchAsync(async (req, res, next) => {
  const today = todayStr();
  const quiz  = await DailyQuiz.findOne({ student: req.user._id, date: today });

  // Check handbook confirmed at the handbook level (not per-course)
  const hasHandbook = !!(await HandbookCourse.findOne({
    student:     req.user._id,
    isConfirmed: true,
  }));

  sendSuccess(res, {
    data: {
      unlocked:    !hasHandbook || (quiz?.socialUnlocked === true),
      hasHandbook,
      quizStatus:  quiz?.status  || 'pending',
      quizScore:   quiz?.score   ?? null,
    },
  });
});

// ═══════════════════════════════════════════════════════════
//  GET /api/quiz/history
// ═══════════════════════════════════════════════════════════
exports.getQuizHistory = catchAsync(async (req, res, next) => {
  const quizzes = await DailyQuiz
    .find({ student: req.user._id, status: 'completed' })
    .sort({ date: -1 })
    .limit(30)
    .select('date score correctCount totalQuestions completedAt');
  sendSuccess(res, { data: { quizzes } });
});
