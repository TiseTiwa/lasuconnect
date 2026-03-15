const express = require('express');
const router  = express.Router();
const { protect } = require('../../middleware/auth');
const {
  getStreams, getStream, createStream,
  startStream, endStream, joinStream,
  leaveStream, deleteStream,
} = require('./live.controller');

router.use(protect);

router.get('/',          getStreams);
router.post('/',         createStream);
router.get('/:id',       getStream);
router.patch('/:id/start', startStream);
router.patch('/:id/end',   endStream);
router.post('/:id/join',   joinStream);
router.post('/:id/leave',  leaveStream);
router.delete('/:id',      deleteStream);

module.exports = router;
