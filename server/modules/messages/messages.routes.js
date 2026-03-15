const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const {
  getConversations,
  getOrCreateDM,
  createGroup,
  getConversation,
  getMessages,
  sendMessage,
  deleteMessage,
  markAsRead,
  searchConversations,
} = require('./messages.controller');

router.use(protect);

// ── Inbox & search ────────────────────────────────────────
router.get('/conversations',          getConversations);
router.get('/conversations/search',   searchConversations);
router.post('/conversations',         getOrCreateDM);
router.post('/conversations/group',   createGroup);

// ── Single conversation ───────────────────────────────────
router.get('/conversations/:id',               getConversation);
router.patch('/conversations/:id/read',        markAsRead);

// ── Messages ──────────────────────────────────────────────
router.get('/conversations/:id/messages',      getMessages);
router.post('/conversations/:id/messages',     sendMessage);
router.delete('/conversations/:id/messages/:msgId', deleteMessage);

module.exports = router;
