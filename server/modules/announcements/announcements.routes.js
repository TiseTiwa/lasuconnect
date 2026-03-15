const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const { uploadDocument } = require('../../middleware/upload');
const {
  getAnnouncements, getUnreadCount, getAnnouncement,
  createAnnouncement, markAsRead, markAllAsRead,
  deleteAnnouncement, togglePin,
  getComments, addComment, deleteComment,
} = require('./announcements.controller');

router.use(protect);

router.get('/',            getAnnouncements);
router.get('/unread-count', getUnreadCount);
router.patch('/read-all',  markAllAsRead);
router.post('/', uploadDocument.single('attachment'), createAnnouncement);

router.get('/:id',         getAnnouncement);
router.patch('/:id/read',  markAsRead);
router.patch('/:id/pin',   togglePin);
router.delete('/:id',      deleteAnnouncement);

// ── Comments ──────────────────────────────────────────────
router.get('/:id/comments',              getComments);
router.post('/:id/comments',             addComment);
router.delete('/:id/comments/:commentId', deleteComment);

module.exports = router;
