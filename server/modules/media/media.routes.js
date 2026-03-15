const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const { uploadImage, uploadMedia, uploadDocument } = require('../../middleware/upload');
const {
  uploadAvatar, uploadCover, uploadPostMedia, uploadDocument: uploadDoc,
} = require('./media.controller');

// All media routes require authentication
router.use(protect);

// ── Profile media ─────────────────────────────────────────
router.post('/avatar',   uploadImage.single('avatar'),       uploadAvatar);
router.post('/cover',    uploadImage.single('cover'),         uploadCover);

// ── Post media (up to 4 files) ────────────────────────────
router.post('/post',     uploadMedia.array('media', 4),       uploadPostMedia);

// ── Course document (PDF) ─────────────────────────────────
router.post('/document', uploadDocument.single('document'),   uploadDoc);

module.exports = router;
