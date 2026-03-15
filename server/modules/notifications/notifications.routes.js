const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAll,
} = require('./notifications.controller');

router.use(protect);

router.get('/',                   getNotifications);
router.get('/unread-count',       getUnreadCount);
router.patch('/read-all',         markAllAsRead);
router.delete('/',                clearAll);
router.patch('/:id/read',         markAsRead);
router.delete('/:id',             deleteNotification);

module.exports = router;
