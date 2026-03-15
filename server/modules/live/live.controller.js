const LiveStream = require('../../models/LiveStream');
const catchAsync = require('../../utils/catchAsync');
const AppError = require('../../utils/AppError');
const { sendSuccess } = require('../../utils/apiResponse');
const { createAndEmit } = require('../../utils/notificationHelper');

const HOST_SELECT = 'fullName username avatarUrl department faculty role';

// ────────────────────────────────────────────────────────────
//  GET /api/live  — Get all live + scheduled streams
// ────────────────────────────────────────────────────────────
exports.getStreams = catchAsync(async (req, res, next) => {
  const { status = 'live', page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const query = {};
  if (status === 'live')      query.status = 'live';
  if (status === 'scheduled') query.status = 'scheduled';
  if (status === 'ended')     query.status = 'ended';
  if (status === 'all')       query.status = { $in: ['live', 'scheduled'] };

  const [streams, total] = await Promise.all([
    LiveStream.find(query)
      .populate('host', HOST_SELECT)
      .sort({ status: -1, createdAt: -1 }) // live first, then scheduled
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    LiveStream.countDocuments(query),
  ]);

  sendSuccess(res, {
    data: { streams },
    meta: { total, page: parseInt(page), hasMore: skip + streams.length < total },
  });
});

// ────────────────────────────────────────────────────────────
//  GET /api/live/:id  — Get single stream
// ────────────────────────────────────────────────────────────
exports.getStream = catchAsync(async (req, res, next) => {
  const stream = await LiveStream.findById(req.params.id)
    .populate('host', HOST_SELECT);
  if (!stream) return next(new AppError('Stream not found.', 404));
  sendSuccess(res, { data: { stream } });
});

// ────────────────────────────────────────────────────────────
//  POST /api/live  — Create / schedule a stream
// ────────────────────────────────────────────────────────────
exports.createStream = catchAsync(async (req, res, next) => {
  const { title, description, category, scheduledFor, tags, visibility, targetDepartment, targetFaculty } = req.body;

  if (!title?.trim()) return next(new AppError('Stream title is required.', 400));

  const stream = await LiveStream.create({
    host:             req.user._id,
    title:            title.trim(),
    description:      description?.trim() || '',
    category:         category || 'general',
    status:           scheduledFor ? 'scheduled' : 'scheduled', // always start as scheduled
    scheduledFor:     scheduledFor || null,
    tags:             tags || [],
    visibility:       visibility || 'public',
    targetDepartment: targetDepartment || null,
    targetFaculty:    targetFaculty || null,
  });

  await stream.populate('host', HOST_SELECT);
  sendSuccess(res, { statusCode: 201, data: { stream } });
});

// ────────────────────────────────────────────────────────────
//  PATCH /api/live/:id/start  — Go live
// ────────────────────────────────────────────────────────────
exports.startStream = catchAsync(async (req, res, next) => {
  const stream = await LiveStream.findOne({ _id: req.params.id, host: req.user._id });
  if (!stream) return next(new AppError('Stream not found or you are not the host.', 404));
  if (stream.status === 'live') return next(new AppError('Stream is already live.', 400));
  if (stream.status === 'ended') return next(new AppError('Stream has already ended.', 400));

  stream.status    = 'live';
  stream.startedAt = new Date();
  await stream.save();

  await stream.populate('host', HOST_SELECT);

  // Notify followers
  if (req.io) {
    req.io.emit('stream:started', {
      _id:         stream._id,
      title:       stream.title,
      host:        { fullName: req.user.fullName, username: req.user.username, avatarUrl: req.user.avatarUrl },
      category:    stream.category,
      viewerCount: 0,
    });
  }

  sendSuccess(res, { message: 'You are now live!', data: { stream } });
});

// ────────────────────────────────────────────────────────────
//  PATCH /api/live/:id/end  — End stream
// ────────────────────────────────────────────────────────────
exports.endStream = catchAsync(async (req, res, next) => {
  const stream = await LiveStream.findOne({ _id: req.params.id, host: req.user._id });
  if (!stream) return next(new AppError('Stream not found or you are not the host.', 404));
  if (stream.status === 'ended') return next(new AppError('Stream has already ended.', 400));

  stream.status  = 'ended';
  stream.endedAt = new Date();
  await stream.save();

  if (req.io) {
    req.io.to(`stream:${stream._id}`).emit('stream:ended', { streamId: stream._id });
  }

  sendSuccess(res, { message: 'Stream ended.', data: { stream } });
});

// ────────────────────────────────────────────────────────────
//  POST /api/live/:id/join  — Join as viewer (track analytics)
// ────────────────────────────────────────────────────────────
exports.joinStream = catchAsync(async (req, res, next) => {
  const stream = await LiveStream.findById(req.params.id);
  if (!stream) return next(new AppError('Stream not found.', 404));
  if (stream.status !== 'live') return next(new AppError('Stream is not live.', 400));

  // Track unique viewers
  const alreadyViewed = stream.viewers.some(id => id.toString() === req.user._id.toString());
  if (!alreadyViewed) {
    stream.viewers.push(req.user._id);
    stream.totalViewers += 1;
  }

  stream.viewerCount = Math.max(0, (stream.viewerCount || 0) + 1);
  if (stream.viewerCount > stream.peakViewers) {
    stream.peakViewers = stream.viewerCount;
  }
  await stream.save({ validateBeforeSave: false });

  // Tell the host + all viewers someone joined
  if (req.io) {
    req.io.to(`stream:${stream._id}`).emit('stream:viewer_count', { viewerCount: stream.viewerCount });
  }

  sendSuccess(res, { data: { stream } });
});

// ────────────────────────────────────────────────────────────
//  POST /api/live/:id/leave  — Viewer left
// ────────────────────────────────────────────────────────────
exports.leaveStream = catchAsync(async (req, res, next) => {
  const stream = await LiveStream.findById(req.params.id);
  if (!stream) return next(new AppError('Stream not found.', 404));

  stream.viewerCount = Math.max(0, (stream.viewerCount || 1) - 1);
  await stream.save({ validateBeforeSave: false });

  if (req.io) {
    req.io.to(`stream:${stream._id}`).emit('stream:viewer_count', { viewerCount: stream.viewerCount });
  }

  sendSuccess(res, { message: 'Left stream.' });
});

// ────────────────────────────────────────────────────────────
//  DELETE /api/live/:id  — Delete a scheduled stream
// ────────────────────────────────────────────────────────────
exports.deleteStream = catchAsync(async (req, res, next) => {
  const stream = await LiveStream.findOne({ _id: req.params.id, host: req.user._id });
  if (!stream) return next(new AppError('Stream not found.', 404));
  if (stream.status === 'live') return next(new AppError('Cannot delete a live stream. End it first.', 400));

  await stream.deleteOne();
  sendSuccess(res, { message: 'Stream deleted.' });
});
