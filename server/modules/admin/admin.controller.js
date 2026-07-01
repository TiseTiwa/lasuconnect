const User = require('../../models/User');
const Post = require('../../models/Post');
const Reel = require('../../models/Reel');
const Course = require('../../models/Course');
const Announcement = require('../../models/Announcement');
const Conversation = require('../../models/Conversation');
const catchAsync = require('../../utils/catchAsync');
const AppError = require('../../utils/AppError');
const { sendSuccess } = require('../../utils/apiResponse');

// ────────────────────────────────────────────────────────────
//  GET /api/admin/stats
// ────────────────────────────────────────────────────────────
exports.getStats = catchAsync(async (req, res) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart  = new Date(now - 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers, todayUsers, weekUsers,
    totalPosts, todayPosts, weekPosts,
    totalReels, weekReels,
    totalCourses, totalAnnouncements, totalConversations,
    roleBreakdownRaw, levelBreakdownRaw,
    recentUsers, facultyBreakdownRaw,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ createdAt: { $gte: todayStart } }),
    User.countDocuments({ createdAt: { $gte: weekStart } }),
    Post.countDocuments(),
    Post.countDocuments({ createdAt: { $gte: todayStart } }),
    Post.countDocuments({ createdAt: { $gte: weekStart } }),
    Reel.countDocuments(),
    Reel.countDocuments({ createdAt: { $gte: weekStart } }),
    Course.countDocuments(),
    Announcement.countDocuments(),
    Conversation.countDocuments(),
    User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
    User.aggregate([{ $match: { level: { $ne: null } } }, { $group: { _id: '$level', count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    User.find().sort({ createdAt: -1 }).limit(5).select('fullName username avatarUrl role department createdAt').lean(),
    User.aggregate([{ $match: { faculty: { $ne: null } } }, { $group: { _id: '$faculty', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 5 }]),
  ]);

  const roleBreakdown = {};
  roleBreakdownRaw.forEach(r => { roleBreakdown[r._id] = r.count; });

  sendSuccess(res, {
    data: {
      users:         { total: totalUsers, today: todayUsers, week: weekUsers },
      posts:         { total: totalPosts, today: todayPosts, week: weekPosts },
      reels:         { total: totalReels, week: weekReels },
      courses:       { total: totalCourses },
      announcements: { total: totalAnnouncements },
      conversations: { total: totalConversations },
      roleBreakdown,
      levelBreakdown: levelBreakdownRaw,
      recentUsers,
      facultyBreakdown: facultyBreakdownRaw,
    },
  });
});

// ────────────────────────────────────────────────────────────
//  GET /api/admin/users
// ────────────────────────────────────────────────────────────
exports.getUsers = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, search = '', role = '' } = req.query;
  const skip = (page - 1) * limit;

  const query = {};
  if (role) query.role = role;
  if (search.trim()) {
    const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(escaped, 'i');
    query.$or = [{ fullName: re }, { email: re }, { username: re }, { matricNumber: re }];
  }

  const [users, total] = await Promise.all([
    User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .select('fullName username email avatarUrl role roleVerified isVerified isActive faculty department level matricNumber staffId createdAt lastSeen')
      .lean(),
    User.countDocuments(query),
  ]);

  sendSuccess(res, {
    data: { users },
    meta: { total, page: Number(page), limit: Number(limit), hasMore: skip + users.length < total },
  });
});

// ────────────────────────────────────────────────────────────
//  PATCH /api/admin/users/:id/role
// ────────────────────────────────────────────────────────────
exports.updateUserRole = catchAsync(async (req, res, next) => {
  const { role } = req.body;
  const validRoles = ['student', 'course_rep', 'lecturer', 'admin', 'super_admin'];
  if (!validRoles.includes(role)) return next(new AppError('Invalid role.', 400));

  // Only super_admin can assign admin roles
  if (['admin', 'super_admin'].includes(role) && req.user.role !== 'super_admin') {
    return next(new AppError('Only a super admin can assign admin roles.', 403));
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { role },
    { new: true, select: 'fullName role' }
  );
  if (!user) return next(new AppError('User not found.', 404));

  sendSuccess(res, {
    message: `${user.fullName}'s role updated to ${role}.`,
    data: { role: user.role },
  });
});

// ────────────────────────────────────────────────────────────
//  PATCH /api/admin/users/:id/verify
// ────────────────────────────────────────────────────────────
exports.verifyUser = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isVerified: true, verificationToken: undefined },
    { new: true, select: 'fullName isVerified' }
  );
  if (!user) return next(new AppError('User not found.', 404));

  sendSuccess(res, {
    message: `${user.fullName} has been verified.`,
    data: { isVerified: true },
  });
});

// ────────────────────────────────────────────────────────────
//  PATCH /api/admin/users/:id/suspend
// ────────────────────────────────────────────────────────────
exports.toggleSuspend = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) return next(new AppError('User not found.', 404));
  if (user._id.toString() === req.user._id.toString()) {
    return next(new AppError('You cannot suspend your own account.', 400));
  }

  user.isActive = !user.isActive;
  await user.save({ validateBeforeSave: false });

  sendSuccess(res, {
    message: `${user.fullName} has been ${user.isActive ? 'unsuspended' : 'suspended'}.`,
    data: { isActive: user.isActive },
  });
});

// ────────────────────────────────────────────────────────────
//  GET /api/admin/posts
// ────────────────────────────────────────────────────────────
exports.getPosts = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, search = '' } = req.query;
  const skip = (page - 1) * limit;

  const query = {};
  if (search.trim()) {
    const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.content = new RegExp(escaped, 'i');
  }

  const [posts, total] = await Promise.all([
    Post.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('author', 'fullName username avatarUrl role')
      .select('content media likesCount commentsCount feedType visibility createdAt')
      .lean(),
    Post.countDocuments(query),
  ]);

  sendSuccess(res, {
    data: { posts },
    meta: { total, page: Number(page), limit: Number(limit), hasMore: skip + posts.length < total },
  });
});

// ────────────────────────────────────────────────────────────
//  DELETE /api/admin/posts/:id
// ────────────────────────────────────────────────────────────
exports.adminDeletePost = catchAsync(async (req, res, next) => {
  const post = await Post.findByIdAndDelete(req.params.id);
  if (!post) return next(new AppError('Post not found.', 404));

  sendSuccess(res, { message: 'Post removed.' });
});
