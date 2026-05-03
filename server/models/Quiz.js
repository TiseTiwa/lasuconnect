const mongoose = require('mongoose');

// ── Quiz Question ─────────────────────────────────────────
const quizQuestionSchema = new mongoose.Schema(
  {
    courseCode:   { type: String, trim: true, uppercase: true, index: true },
    courseTitle:  { type: String, trim: true },
    department:   { type: String, trim: true },
    level:        { type: String, enum: ['100','200','300','400','500'] },
    question:     { type: String, required: true, trim: true },
    options:      [{ type: String, trim: true }], // 4 options
    correctIndex: { type: Number, required: true }, // 0-3
    explanation:  { type: String, default: '' },
    difficulty:   { type: String, enum: ['easy','medium','hard'], default: 'medium' },
    source:       { type: String, enum: ['predefined','ai'], default: 'predefined' },
    isActive:     { type: Boolean, default: true },
  },
  { timestamps: true }
);

quizQuestionSchema.index({ courseCode: 1, isActive: 1 });

// ── Daily Quiz ────────────────────────────────────────────
const dailyQuizSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    date: { type: String, required: true }, // YYYY-MM-DD — one per student per day

    questions: [
      {
        question:      { type: mongoose.Schema.Types.ObjectId, ref: 'QuizQuestion' },
        courseCode:    { type: String },
        courseTitle:   { type: String },
        // Student's response
        answeredIndex: { type: Number, default: null },
        isCorrect:     { type: Boolean, default: null },
        answeredAt:    { type: Date, default: null },
      },
    ],

    totalQuestions: { type: Number, default: 5 },
    answeredCount:  { type: Number, default: 0 },
    correctCount:   { type: Number, default: 0 },
    score:          { type: Number, default: 0 }, // 0–100

    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed'],
      default: 'pending',
    },
    completedAt: { type: Date, default: null },

    // Whether this completion unlocks the social feed for today
    socialUnlocked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

dailyQuizSchema.index({ student: 1, date: 1 }, { unique: true });
dailyQuizSchema.index({ student: 1, status: 1 });

// ── Streak ────────────────────────────────────────────────
const streakSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    currentStreak:  { type: Number, default: 0 },
    longestStreak:  { type: Number, default: 0 },
    lastCompletedDate: { type: String, default: null }, // YYYY-MM-DD
    totalQuizzesDone:  { type: Number, default: 0 },
    totalCorrect:      { type: Number, default: 0 },
    // Streak history for the last 30 days
    history: [
      {
        date:      { type: String }, // YYYY-MM-DD
        completed: { type: Boolean },
        score:     { type: Number },
      },
    ],
  },
  { timestamps: true }
);

const QuizQuestion = mongoose.model('QuizQuestion', quizQuestionSchema);
const DailyQuiz    = mongoose.model('DailyQuiz',    dailyQuizSchema);
const Streak       = mongoose.model('Streak',       streakSchema);

module.exports = { QuizQuestion, DailyQuiz, Streak };
