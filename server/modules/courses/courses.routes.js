const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const { uploadDocument } = require('../../middleware/upload');
const {
  getCourses, getMyCourses, getSuggestedCourses,
  getCourse, createCourse, toggleJoin,
  getResources, uploadResource, toggleResourceLike,
  deleteResource, getDiscussions, postDiscussion,
  incrementDownload,
} = require('./courses.controller');

router.use(protect);

// ── Course discovery ──────────────────────────────────────
router.get('/',            getCourses);
router.get('/my',          getMyCourses);
router.get('/suggestions', getSuggestedCourses);

// ── Course CRUD ───────────────────────────────────────────
router.post('/',    createCourse);
router.get('/:id',  getCourse);

// ── Join / Leave ──────────────────────────────────────────
router.post('/:id/join', toggleJoin);

// ── Resources ─────────────────────────────────────────────
router.get('/:id/resources',                              getResources);
router.post('/:id/resources', uploadDocument.single('document'), uploadResource);
router.post('/:id/resources/:resourceId/like',           toggleResourceLike);
router.delete('/:id/resources/:resourceId',              deleteResource);
router.patch('/:id/resources/:resourceId/download',      incrementDownload);

// ── Discussions ───────────────────────────────────────────
router.get('/:id/discussions',  getDiscussions);
router.post('/:id/discussions', postDiscussion);

module.exports = router;
