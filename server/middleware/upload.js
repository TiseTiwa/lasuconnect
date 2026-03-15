const multer = require('multer');
const AppError = require('../utils/AppError');

// ── Store files in memory (buffer) not disk ───────────────
// We pipe the buffer directly to Cloudinary instead of saving locally
const storage = multer.memoryStorage();

// ── File filter ───────────────────────────────────────────
const fileFilter = (allowedTypes) => (req, file, cb) => {
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`, 400), false);
  }
};

// ── Image only upload (avatar, cover, post images) ────────
const uploadImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: fileFilter([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
  ]),
});

// ── Video upload (reels, posts) ───────────────────────────
const uploadVideo = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max
  fileFilter: fileFilter(['video/mp4', 'video/quicktime', 'video/webm']),
});

// ── Any media (image or video) ────────────────────────────
const uploadMedia = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: fileFilter([
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/quicktime', 'video/webm',
  ]),
});

// ── Document upload (PDFs for course resources) ───────────
const uploadDocument = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB max
  fileFilter: fileFilter([
    'application/pdf',
    'image/jpeg', 'image/jpg', 'image/png',
  ]),
});

module.exports = { uploadImage, uploadVideo, uploadMedia, uploadDocument };
