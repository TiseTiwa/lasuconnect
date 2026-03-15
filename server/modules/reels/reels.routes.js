const express = require('express');
const router  = express.Router();
const { protect } = require('../../middleware/auth');
const { uploadVideo } = require('../../middleware/upload');
const {
  uploadReel, getReels, getTrending,
  toggleLike, getComments, addComment,
  deleteReel, getUserReels,            // ← make sure getUserReels is imported
} = require('./reels.controller');

router.use(protect);

router.get('/',                    getReels);
router.get('/trending',            getTrending);
router.get('/user/:username',      getUserReels);  // ← MUST be before /:id
router.post('/',                   uploadVideo.single('video'), uploadReel);
router.post('/:id/like',           toggleLike);
router.get('/:id/comments',        getComments);
router.post('/:id/comments',       addComment);
router.delete('/:id',              deleteReel);

module.exports = router;