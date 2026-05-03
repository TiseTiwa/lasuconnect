const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const { uploadDocument } = require('../../middleware/upload');
const {
  uploadHandbook, getHandbook, confirmCourses,
  updateCourse, deleteCourse, addCourse,
} = require('./handbook.controller');

router.post('/courses', addCourse);
router.use(protect);
router.get('/',                          getHandbook);
router.post('/upload', uploadDocument.single('handbook'), uploadHandbook);
router.patch('/confirm',                 confirmCourses);
router.patch('/courses/:index',          updateCourse);
router.delete('/courses/:index',         deleteCourse);
router.post('/courses', addCourse); 

module.exports = router;
