const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const {
  getProfile, updateProfile, toggleFollow,
  getFollowers, getFollowing, searchUsers, getSuggestions,
} = require('./users.controller');

// All routes require auth
router.use(protect);

// ── Search & suggestions (before /:username to avoid conflicts)
router.get('/search',      searchUsers);
router.get('/suggestions', getSuggestions);

// ── Own profile update
router.patch('/me',
  [
    body('fullName').optional().trim().isLength({ min: 2, max: 100 }),
    body('bio').optional().isLength({ max: 160 }).withMessage('Bio cannot exceed 160 characters'),
    body('username').optional().trim().isLength({ min: 3, max: 30 }),
  ],
  validate,
  updateProfile
);

// ── Public profile by username
router.get('/:username',           getProfile);
router.post('/:username/follow',   toggleFollow);
router.get('/:username/followers', getFollowers);
router.get('/:username/following', getFollowing);

module.exports = router;
