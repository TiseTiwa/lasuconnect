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

// ── Shuffle helper ────────────────────────────────────────
const shuffleOptions = (options, correctIndex) => {
  // Create indexed array, shuffle, rebuild with new correct index
  const indexed = options.map((opt, i) => ({ opt, isCorrect: i === correctIndex }));
  for (let i = indexed.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indexed[i], indexed[j]] = [indexed[j], indexed[i]];
  }
  return {
    options:      indexed.map(x => x.opt),
    correctIndex: indexed.findIndex(x => x.isCorrect),
  };
};

// ── AI question generation (lazy init — no crash if key missing) ──
const generateAIQuestions = async (courseCode, courseTitle, count = 2) => {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.log('No ANTHROPIC_API_KEY — skipping AI generation');
      return [];
    }
    const Anthropic = require('@anthropic-ai/sdk');
    const client    = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `You are a Nigerian university lecturer creating a multiple-choice quiz.

Generate ${count} challenging questions for: ${courseTitle} (${courseCode})

CRITICAL RULES:
- The correct answer MUST be placed at DIFFERENT positions — do NOT always use index 0
- Use index 0, 1, 2, or 3 randomly and vary them across questions
- Questions must test real understanding, not just recall
- Make distractors (wrong answers) plausible, not obviously wrong
- Nigerian university context and curriculum

Return ONLY this exact JSON structure, no markdown, no extra text:
{
  "questions": [
    {
      "question": "Full question text here?",
      "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
      "correctIndex": 2,
      "explanation": "Brief explanation of why this is correct",
      "difficulty": "medium"
    }
  ]
}

IMPORTANT: correctIndex must be the integer position (0-3) of the correct answer in the options array. Vary it — do not always use 0.`,
      }],
    });

    const text  = response.content[0]?.text || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return [];
    const parsed = JSON.parse(match[0]);
    const questions = parsed.questions || [];

    // Shuffle options server-side as an extra safety net
    return questions.map(q => {
      const { options, correctIndex } = shuffleOptions(q.options, q.correctIndex);
      return { ...q, options, correctIndex };
    });
  } catch (err) {
    console.error('AI question error:', err.message);
    return [];
  }
};

// ── Fallback question bank ────────────────────────────────
const getFallbackQuestion = (courseCode, courseTitle) => {
  const dept = courseCode.replace(/\d+/g, '').toUpperCase();

  const generic = {
    CSC: [
      { question: 'Which data structure operates on a Last-In-First-Out (LIFO) principle?', options: ['Queue', 'Stack', 'Linked List', 'Tree'], correctIndex: 1, explanation: 'A stack uses LIFO — the last element added is the first one removed.', difficulty: 'easy' },
      { question: 'What is the time complexity of binary search on a sorted array?', options: ['O(n)', 'O(n²)', 'O(log n)', 'O(1)'], correctIndex: 2, explanation: 'Binary search halves the search space each step, giving O(log n) complexity.', difficulty: 'medium' },
      { question: 'In object-oriented programming, what does "encapsulation" mean?', options: ['Inheriting properties from a parent class', 'Defining multiple methods with the same name', 'Bundling data and methods that operate on that data within a class', 'Converting one data type to another'], correctIndex: 2, explanation: 'Encapsulation bundles related data and behaviour together and hides internal details.', difficulty: 'medium' },
      { question: 'What does SQL stand for?', options: ['Simple Question Logic', 'Sequential Queue Language', 'Standard Query Library', 'Structured Query Language'], correctIndex: 3, explanation: 'SQL stands for Structured Query Language, used to manage relational databases.', difficulty: 'easy' },
      { question: 'Which of the following is NOT a characteristic of an algorithm?', options: ['Finiteness', 'Definiteness', 'Randomness', 'Effectiveness'], correctIndex: 2, explanation: 'Algorithms must be finite, definite, and effective. Randomness is not a required characteristic.', difficulty: 'medium' },
    ],
    MAT: [
      { question: 'What is the derivative of sin(x)?', options: ['-sin(x)', '-cos(x)', 'tan(x)', 'cos(x)'], correctIndex: 3, explanation: 'The derivative of sin(x) is cos(x).', difficulty: 'easy' },
      { question: 'Which of these is a prime number?', options: ['15', '21', '17', '25'], correctIndex: 2, explanation: '17 is prime; 15=3×5, 21=3×7, 25=5×5.', difficulty: 'easy' },
      { question: 'What is the value of log₁₀(1000)?', options: ['2', '4', '1', '3'], correctIndex: 3, explanation: 'log₁₀(1000) = log₁₀(10³) = 3.', difficulty: 'easy' },
    ],
    PHY: [
      { question: 'Which formula correctly states Newton\'s second law of motion?', options: ['E = mc²', 'v = u + at', 'F = mv', 'F = ma'], correctIndex: 3, explanation: 'Force equals mass times acceleration (F = ma).', difficulty: 'easy' },
      { question: 'What is the SI unit of electric current?', options: ['Volt', 'Ampere', 'Ohm', 'Watt'], correctIndex: 1, explanation: 'The SI unit of electric current is the Ampere (A).', difficulty: 'easy' },
    ],
    CHM: [
      { question: 'What is the atomic number of Carbon?', options: ['8', '6', '12', '14'], correctIndex: 1, explanation: 'Carbon has atomic number 6, meaning it has 6 protons in its nucleus.', difficulty: 'easy' },
      { question: 'Which type of bond involves the sharing of electrons between atoms?', options: ['Ionic bond', 'Metallic bond', 'Covalent bond', 'Hydrogen bond'], correctIndex: 2, explanation: 'Covalent bonds involve the sharing of electron pairs between atoms.', difficulty: 'easy' },
    ],
    BIO: [
      { question: 'Which organelle is known as the "powerhouse of the cell"?', options: ['Nucleus', 'Ribosome', 'Mitochondria', 'Golgi apparatus'], correctIndex: 2, explanation: 'Mitochondria produce ATP through cellular respiration, earning the "powerhouse" name.', difficulty: 'easy' },
      { question: 'What process do plants use to make food using sunlight?', options: ['Respiration', 'Fermentation', 'Transpiration', 'Photosynthesis'], correctIndex: 3, explanation: 'Photosynthesis converts light energy into chemical energy stored as glucose.', difficulty: 'easy' },
    ],
    GNS: [
      { question: 'What does "plagiarism" mean in academic writing?', options: ['Citing too many sources', 'Writing in passive voice', 'Using someone else\'s work without credit', 'Using long sentences'], correctIndex: 2, explanation: 'Plagiarism is presenting someone else\'s work or ideas as your own without proper attribution.', difficulty: 'easy' },
      { question: 'Which of the following is a characteristic of effective communication?', options: ['Ambiguity', 'Verbosity', 'Clarity', 'Complexity'], correctIndex: 2, explanation: 'Effective communication is clear, concise, and unambiguous.', difficulty: 'easy' },
    ],
    ENT: [
      { question: 'What is the primary goal of entrepreneurship?', options: ['Maximising government revenue', 'Creating value through innovation and risk-taking', 'Minimising employee salaries', 'Avoiding market competition'], correctIndex: 1, explanation: 'Entrepreneurship involves creating economic and social value through innovation.', difficulty: 'easy' },
    ],
    ECO: [
      { question: 'What does "GDP" stand for in economics?', options: ['Gross Domestic Product', 'General Development Plan', 'Government Deficit Payment', 'Gross Distribution Price'], correctIndex: 0, explanation: 'GDP (Gross Domestic Product) measures the total value of goods and services produced in a country.', difficulty: 'easy' },
      { question: 'According to the law of demand, when price increases, what happens to quantity demanded?', options: ['It decreases', 'It increases', 'It stays the same', 'It doubles'], correctIndex: 0, explanation: 'The law of demand states that as price rises, quantity demanded falls, all else equal.', difficulty: 'easy' },
    ],
    ACC: [
      { question: 'What is the accounting equation?', options: ['Revenue = Expenses + Profit', 'Assets = Liabilities - Equity', 'Assets = Liabilities + Equity', 'Profit = Revenue × Expenses'], correctIndex: 2, explanation: 'The fundamental accounting equation is: Assets = Liabilities + Equity.', difficulty: 'easy' },
    ],
    LAW: [
      { question: 'What is the Latin term for "let the decision stand" in legal precedent?', options: ['Habeas corpus', 'Stare decisis', 'Prima facie', 'Mens rea'], correctIndex: 1, explanation: '"Stare decisis" means courts should follow prior decisions when the same issues arise.', difficulty: 'medium' },
    ],
  };

  const pool = generic[dept] || [
    { question: `Which statement best describes ${courseTitle} as an academic discipline?`, options: ['A purely practical skill with no theoretical basis', 'An ancient discipline with no modern relevance', 'An informal collection of unverified opinions', 'A systematic field with defined principles and methodologies'], correctIndex: 3, explanation: `${courseTitle} is a structured academic discipline with established principles and methodologies.`, difficulty: 'easy' },
  ];

  // Pick random question from pool then shuffle its options
  const base = pool[Math.floor(Math.random() * pool.length)];
  const { options, correctIndex } = shuffleOptions(base.options, base.correctIndex);
  return { ...base, options, correctIndex };
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
