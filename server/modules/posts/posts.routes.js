const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const {
  createPost, getFeed, getPost, updatePost, deletePost,
  toggleLike, getComments, addComment, deleteComment,
  getUserPosts, toggleCommentLike,
} = require('./posts.controller');

// All post routes require authentication
router.use(protect);

// ── Feed ──────────────────────────────────────────────────
router.get('/feed', getFeed);

// ── User posts ────────────────────────────────────────────
router.get('/user/:username', getUserPosts);

// ── CRUD ──────────────────────────────────────────────────
router.post('/',
  [body('content').optional().isLength({ max: 2000 }).withMessage('Content too long'),
   body('feedType').optional().isIn(['social', 'academic']),
   body('visibility').optional().isIn(['public', 'followers', 'department', 'faculty', 'private'])],
  validate, createPost
);

router.get('/:id',      getPost);
router.patch('/:id',    updatePost);
router.delete('/:id',   deletePost);

// ── Likes ─────────────────────────────────────────────────
router.post('/:id/like', toggleLike);

// ── Comments ──────────────────────────────────────────────
router.get('/:id/comments', getComments);
router.post('/:id/comments',
  [body('content').trim().notEmpty().withMessage('Comment cannot be empty')
    .isLength({ max: 500 }).withMessage('Comment too long')],
  validate, addComment
);
router.delete('/:id/comments/:commentId', deleteComment);
router.post('/:id/comments/:commentId/like', toggleCommentLike);

module.exports = router;
