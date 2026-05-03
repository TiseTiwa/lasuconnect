const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const {
  getTodayQuiz, submitAnswer, getStreak,
  getFeedGate, getQuizHistory,
} = require('./quiz.controller');

router.use(protect);
router.get('/today',       getTodayQuiz);
router.post('/answer',     submitAnswer);
router.get('/streak',      getStreak);
router.get('/feed-gate',   getFeedGate);
router.get('/history',     getQuizHistory);

module.exports = router;
