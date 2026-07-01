const LiveStream = require('../../models/LiveStream');
const User = require('../../models/User');
const catchAsync = require('../../utils/catchAsync');
const AppError = require('../../utils/AppError');
const { sendSuccess } = require('../../utils/apiResponse');

const HOST_SELECT = 'fullName username avatarUrl department faculty role';

// ────────────────────────────────────────────────────────────
//  GET /api/live
// ────────────────────────────────────────────────────────────
exports.getStreams = catchAsync(async (req, res) => {
  const { status = 'live', page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const query = {};
  if (status === 'live')      query.status = 'live';
  if (status === 'scheduled') query.status = 'scheduled';
  if (status === 'ended')     query.status = 'ended';
  if (status === 'all')       query.status = { $in: ['live', 'scheduled'] };

  // M-1 fix: enforce visibility scoping
  const user = req.user;
  const visibilityFilter = {
    $or: [
      { visibility: 'public' },
      { visibility: 'department', targetDepartment: user.department },
      { visibility: 'faculty',    targetFaculty:    user.faculty    },
      { host: user._id }, // always show own streams
    ],
  };
  Object.assign(query, visibilityFilter);

  const [streams, total] = await Promise.all([
    LiveStream.find(query)
      .populate('host', HOST_SELECT)
      .sort({ status: -1, createdAt: -1 })
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
//  GET /api/live/:id
// ────────────────────────────────────────────────────────────
exports.getStream = catchAsync(async (req, res, next) => {
  const stream = await LiveStream.findById(req.params.id).populate('host', HOST_SELECT);
  if (!stream) return next(new AppError('Stream not found.', 404));
  sendSuccess(res, { data: { stream } });
});

// ────────────────────────────────────────────────────────────
//  POST /api/live
// ────────────────────────────────────────────────────────────
exports.createStream = catchAsync(async (req, res, next) => {
  const { title, description, category, scheduledFor, tags, visibility, targetDepartment, targetFaculty } = req.body;

  if (!title?.trim()) return next(new AppError('Stream title is required.', 400));

  const stream = await LiveStream.create({
    host:             req.user._id,
    title:            title.trim(),
    description:      description?.trim() || '',
    category:         category || 'general',
    status:           'scheduled', // A-1 fix: was dead ternary
    scheduledFor:     scheduledFor || null,
    tags:             tags || [],
    visibility:       visibility || 'public',
    // A-2 fix: use host's actual dept/faculty, not arbitrary input
    targetDepartment: visibility === 'department' ? (req.user.department || null) : null,
    targetFaculty:    visibility === 'faculty'    ? (req.user.faculty    || null) : null,
  });

  await stream.populate('host', HOST_SELECT);
  sendSuccess(res, { statusCode: 201, data: { stream } });
});

// ────────────────────────────────────────────────────────────
//  PATCH /api/live/:id/start
// ────────────────────────────────────────────────────────────
exports.startStream = catchAsync(async (req, res, next) => {
  // A-4 fix: atomic findOneAndUpdate with status guard prevents TOCTOU race
  const stream = await LiveStream.findOneAndUpdate(
    { _id: req.params.id, host: req.user._id, status: 'scheduled' },
    { $set: { status: 'live', startedAt: new Date() } },
    { new: true }
  ).populate('host', HOST_SELECT);

  if (!stream) {
    const existing = await LiveStream.findOne({ _id: req.params.id, host: req.user._id });
    if (!existing)             return next(new AppError('Stream not found or you are not the host.', 404));
    if (existing.status === 'live')  return next(new AppError('Stream is already live.', 400));
    if (existing.status === 'ended') return next(new AppError('Stream has already ended.', 400));
  }

  if (req.io) {
    req.io.emit('stream:started', {
      _id:         stream._id,
      title:       stream.title,
      host:        { fullName: stream.host.fullName, username: stream.host.username, avatarUrl: stream.host.avatarUrl },
      category:    stream.category,
      status:      stream.status,
      startedAt:   stream.startedAt,
      viewerCount: 0,
    });
  }

  sendSuccess(res, { message: 'You are now live!', data: { stream } });
});

// ────────────────────────────────────────────────────────────
//  PATCH /api/live/:id/end
// ────────────────────────────────────────────────────────────
exports.endStream = catchAsync(async (req, res, next) => {
  const stream = await LiveStream.findOne({ _id: req.params.id, host: req.user._id });
  if (!stream) return next(new AppError('Stream not found or you are not the host.', 404));
  if (stream.status === 'ended') return next(new AppError('Stream has already ended.', 400));

  stream.status  = 'ended';
  stream.endedAt = new Date();
  await stream.save();

  // B-3 fix: only the socket handler emits stream:ended — REST does NOT emit it
  // The broadcaster client emits stream:end socket event which triggers the relay

  sendSuccess(res, { message: 'Stream ended.', data: { stream } });
});

// ────────────────────────────────────────────────────────────
//  POST /api/live/:id/join
// ────────────────────────────────────────────────────────────
exports.joinStream = catchAsync(async (req, res, next) => {
  const stream = await LiveStream.findById(req.params.id);
  if (!stream) return next(new AppError('Stream not found.', 404));
  if (stream.status !== 'live') return next(new AppError('Stream is not live.', 400));

  // A-5 fix: use atomic $inc to prevent race conditions on viewerCount
  const alreadyViewed = stream.viewers.some(id => id.toString() === req.user._id.toString());
  const update = {
    $inc: { viewerCount: 1 },
  };
  if (!alreadyViewed) {
    update.$push  = { viewers: req.user._id };
    update.$inc.totalViewers = 1;
  }

  const updated = await LiveStream.findByIdAndUpdate(req.params.id, update, { new: true });

  if (updated.viewerCount > (updated.peakViewers || 0)) {
    await LiveStream.findByIdAndUpdate(req.params.id, { peakViewers: updated.viewerCount });
  }

  // Emit updated viewer count via socket (single source of truth = socket in-memory Set,
  // but we sync DB here for persistence)
  if (req.io) {
    req.io.to(`stream:${req.params.id}`).emit('stream:viewer_count', {
      viewerCount: updated.viewerCount,
    });
  }

  sendSuccess(res, { data: { stream: updated } });
});

// ────────────────────────────────────────────────────────────
//  POST /api/live/:id/leave
// ────────────────────────────────────────────────────────────
exports.leaveStream = catchAsync(async (req, res, next) => {
  // A-6 fix: only decrement if viewerCount > 0, use atomic $inc
  await LiveStream.findOneAndUpdate(
    { _id: req.params.id, viewerCount: { $gt: 0 } },
    { $inc: { viewerCount: -1 } }
  );
  sendSuccess(res, { message: 'Left stream.' });
});

// ────────────────────────────────────────────────────────────
//  DELETE /api/live/:id
// ────────────────────────────────────────────────────────────
exports.deleteStream = catchAsync(async (req, res, next) => {
  const stream = await LiveStream.findOne({ _id: req.params.id, host: req.user._id });
  if (!stream) return next(new AppError('Stream not found.', 404));
  if (stream.status === 'live') return next(new AppError('Cannot delete a live stream. End it first.', 400));

  await stream.deleteOne();

  // Notify clients so stream list updates in real time
  if (req.io) req.io.emit('stream:deleted', { streamId: req.params.id });

  sendSuccess(res, { message: 'Stream deleted.' });
});
