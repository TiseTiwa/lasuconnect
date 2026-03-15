const Announcement = require('../../models/Announcement');
const AnnouncementComment = require('../../models/AnnouncementComment');
const User = require('../../models/User');
const catchAsync = require('../../utils/catchAsync');
const AppError = require('../../utils/AppError');
const { sendSuccess } = require('../../utils/apiResponse');
const { uploadToCloudinary } = require('../../utils/cloudinaryUpload');

const AUTHOR_SELECT = 'fullName username avatarUrl role department faculty';
const ALLOWED_ROLES = ['admin', 'super_admin', 'lecturer', 'course_rep'];

const buildVisibilityQuery = (user) => ({
  isDeleted: false,
  $or: [
    { scope: 'university' },
    { scope: 'faculty',     targetFaculty:     new RegExp(user.faculty,     'i') },
    { scope: 'department',  targetDepartment:  new RegExp(user.department,  'i') },
    { scope: 'level',       targetLevel:       user.level },
    { scope: 'course' },
  ],
  $and: [
    { $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] },
  ],
});

// ────────────────────────────────────────────────────────────
//  GET /api/announcements
// ────────────────────────────────────────────────────────────
exports.getAnnouncements = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 20, scope, priority, search, from, to } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const user = await User.findById(req.user._id).select('faculty department level');
  const query = buildVisibilityQuery(user);

  if (scope) query.scope = scope;
  if (priority) query.priority = priority;

  // ── Keyword search ────────────────────────────────────
  if (search?.trim()) {
    const regex = new RegExp(search.trim(), 'i');
    query.$and = query.$and || [];
    query.$and.push({ $or: [{ title: regex }, { content: regex }] });
  }

  // ── Date range filter ─────────────────────────────────
  if (from || to) {
    const dateFilter = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to)   dateFilter.$lte = new Date(new Date(to).setHours(23, 59, 59));
    query.createdAt = dateFilter;
  }

  const [announcements, total, unreadCount] = await Promise.all([
    Announcement.find(query)
      .populate('author', AUTHOR_SELECT)
      .sort({ isPinned: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Announcement.countDocuments(query),
    Announcement.countDocuments({ ...query, readBy: { $ne: req.user._id } }),
  ]);

  // Attach comment counts
  const ids = announcements.map(a => a._id);
  const commentCounts = await AnnouncementComment.aggregate([
    { $match: { announcement: { $in: ids }, isDeleted: false } },
    { $group: { _id: '$announcement', count: { $sum: 1 } } },
  ]);
  const countMap = {};
  commentCounts.forEach(c => { countMap[c._id.toString()] = c.count; });

  const enriched = announcements.map(a => ({
    ...a,
    isRead:        a.readBy?.some(id => id.toString() === req.user._id.toString()) || false,
    readCount:     a.readBy?.length || 0,
    commentsCount: countMap[a._id.toString()] || 0,
    readBy:        undefined,
  }));

  sendSuccess(res, {
    data: { announcements: enriched },
    meta: { total, unreadCount, page: parseInt(page), hasMore: skip + announcements.length < total },
  });
});

// ────────────────────────────────────────────────────────────
//  GET /api/announcements/unread-count
// ────────────────────────────────────────────────────────────
exports.getUnreadCount = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id).select('faculty department level');
  const query = buildVisibilityQuery(user);
  query.readBy = { $ne: req.user._id };
  const count = await Announcement.countDocuments(query);
  sendSuccess(res, { data: { count } });
});

// ────────────────────────────────────────────────────────────
//  GET /api/announcements/:id
// ────────────────────────────────────────────────────────────
exports.getAnnouncement = catchAsync(async (req, res, next) => {
  const announcement = await Announcement.findOne({ _id: req.params.id, isDeleted: false })
    .populate('author', AUTHOR_SELECT);
  if (!announcement) return next(new AppError('Announcement not found.', 404));

  // Auto-mark as read
  if (!announcement.readBy.some(id => id.toString() === req.user._id.toString())) {
    announcement.readBy.push(req.user._id);
    await announcement.save({ validateBeforeSave: false });
  }

  const commentsCount = await AnnouncementComment.countDocuments({
    announcement: announcement._id, isDeleted: false,
  });

  sendSuccess(res, {
    data: {
      announcement: {
        ...announcement.toObject(),
        isRead:        true,
        readCount:     announcement.readBy.length,
        commentsCount,
        readBy:        undefined,
      },
    },
  });
});

// ────────────────────────────────────────────────────────────
//  POST /api/announcements
// ────────────────────────────────────────────────────────────
exports.createAnnouncement = catchAsync(async (req, res, next) => {
  if (!ALLOWED_ROLES.includes(req.user.role)) {
    return next(new AppError('Only admins, lecturers, and course reps can post announcements.', 403));
  }

  const {
    title, content, scope, targetFaculty, targetDepartment,
    targetLevel, targetCourse, priority, isPinned, expiresAt,
  } = req.body;

  if (!title?.trim())   return next(new AppError('Title is required.', 400));
  if (!content?.trim()) return next(new AppError('Content is required.', 400));
  if (!scope)           return next(new AppError('Scope is required.', 400));
  if (scope === 'faculty'    && !targetFaculty)    return next(new AppError('Target faculty required.', 400));
  if (scope === 'department' && !targetDepartment) return next(new AppError('Target department required.', 400));
  if (scope === 'level'      && !targetLevel)      return next(new AppError('Target level required.', 400));

  let mediaUrl = null, attachmentUrl = null, attachmentName = null;
  if (req.file) {
    const isPDF = req.file.mimetype === 'application/pdf';
    const result = await uploadToCloudinary(req.file.buffer, {
      folder: 'lasuconnect/announcements',
      resource_type: isPDF ? 'raw' : 'image',
    });
    if (isPDF) { attachmentUrl = result.secure_url; attachmentName = req.file.originalname; }
    else       { mediaUrl = result.secure_url; }
  }

  const announcement = await Announcement.create({
    author: req.user._id, title: title.trim(), content: content.trim(),
    scope, targetFaculty: targetFaculty || null, targetDepartment: targetDepartment || null,
    targetLevel: targetLevel || null, targetCourse: targetCourse || null,
    priority: priority || 'normal', isPinned: isPinned === 'true' || isPinned === true,
    expiresAt: expiresAt || null, mediaUrl, attachmentUrl, attachmentName,
  });

  await announcement.populate('author', AUTHOR_SELECT);

  if (req.io) {
    req.io.emit('announcement:new', {
      _id: announcement._id, title: announcement.title,
      scope: announcement.scope, priority: announcement.priority,
      author: { fullName: req.user.fullName },
    });
  }

  sendSuccess(res, {
    statusCode: 201,
    data: {
      announcement: {
        ...announcement.toObject(),
        isRead: false, readCount: 0, commentsCount: 0, readBy: undefined,
      },
    },
  });
});

// ────────────────────────────────────────────────────────────
//  PATCH /api/announcements/:id/read
// ────────────────────────────────────────────────────────────
exports.markAsRead = catchAsync(async (req, res, next) => {
  await Announcement.findByIdAndUpdate(req.params.id, { $addToSet: { readBy: req.user._id } });
  sendSuccess(res, { message: 'Marked as read.' });
});

// ────────────────────────────────────────────────────────────
//  PATCH /api/announcements/read-all
// ────────────────────────────────────────────────────────────
exports.markAllAsRead = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id).select('faculty department level');
  const query = buildVisibilityQuery(user);
  const announcements = await Announcement.find(query).select('_id');
  await Announcement.updateMany(
    { _id: { $in: announcements.map(a => a._id) } },
    { $addToSet: { readBy: req.user._id } }
  );
  sendSuccess(res, { message: 'All marked as read.' });
});

// ────────────────────────────────────────────────────────────
//  DELETE /api/announcements/:id
// ────────────────────────────────────────────────────────────
exports.deleteAnnouncement = catchAsync(async (req, res, next) => {
  const announcement = await Announcement.findById(req.params.id);
  if (!announcement) return next(new AppError('Announcement not found.', 404));
  const isAuthor = announcement.author.toString() === req.user._id.toString();
  const isAdmin  = ['admin', 'super_admin'].includes(req.user.role);
  if (!isAuthor && !isAdmin) return next(new AppError('You cannot delete this announcement.', 403));
  announcement.isDeleted = true;
  await announcement.save();
  sendSuccess(res, { message: 'Announcement deleted.' });
});

// ────────────────────────────────────────────────────────────
//  PATCH /api/announcements/:id/pin
// ────────────────────────────────────────────────────────────
exports.togglePin = catchAsync(async (req, res, next) => {
  if (!['admin', 'super_admin'].includes(req.user.role)) {
    return next(new AppError('Only admins can pin announcements.', 403));
  }
  const announcement = await Announcement.findById(req.params.id);
  if (!announcement) return next(new AppError('Announcement not found.', 404));
  announcement.isPinned = !announcement.isPinned;
  await announcement.save();
  sendSuccess(res, { data: { isPinned: announcement.isPinned } });
});

// ────────────────────────────────────────────────────────────
//  GET /api/announcements/:id/comments
// ────────────────────────────────────────────────────────────
exports.getComments = catchAsync(async (req, res, next) => {
  const comments = await AnnouncementComment.find({
    announcement: req.params.id, isDeleted: false,
  })
    .populate('author', 'fullName username avatarUrl role')
    .sort({ createdAt: 1 })
    .limit(100)
    .lean();
  sendSuccess(res, { data: { comments } });
});

// ────────────────────────────────────────────────────────────
//  POST /api/announcements/:id/comments
// ────────────────────────────────────────────────────────────
exports.addComment = catchAsync(async (req, res, next) => {
  const { content } = req.body;
  if (!content?.trim()) return next(new AppError('Comment cannot be empty.', 400));

  const announcement = await Announcement.findOne({ _id: req.params.id, isDeleted: false });
  if (!announcement) return next(new AppError('Announcement not found.', 404));

  const comment = await AnnouncementComment.create({
    announcement: req.params.id,
    author: req.user._id,
    content: content.trim(),
  });
  await comment.populate('author', 'fullName username avatarUrl role');

  sendSuccess(res, { statusCode: 201, data: { comment } });
});

// ────────────────────────────────────────────────────────────
//  DELETE /api/announcements/:id/comments/:commentId
// ────────────────────────────────────────────────────────────
exports.deleteComment = catchAsync(async (req, res, next) => {
  const comment = await AnnouncementComment.findById(req.params.commentId);
  if (!comment || comment.isDeleted) return next(new AppError('Comment not found.', 404));
  const isAuthor = comment.author.toString() === req.user._id.toString();
  const isAdmin  = ['admin', 'super_admin'].includes(req.user.role);
  if (!isAuthor && !isAdmin) return next(new AppError('You cannot delete this comment.', 403));
  comment.isDeleted = true;
  await comment.save();
  sendSuccess(res, { message: 'Comment deleted.' });
});
