const User = require('../../models/User');
const Post = require('../../models/Post');
const catchAsync = require('../../utils/catchAsync');
const AppError = require('../../utils/AppError');
const { sendSuccess } = require('../../utils/apiResponse');
const { createAndEmit } = require('../../utils/notificationHelper'); // ← clean import

const SAFE_FIELDS = 'fullName username email matricNumber role faculty department level bio avatarUrl coverUrl interests skills badges followers following isVerified createdAt lastSeen';

const formatUser = (user, currentUserId) => {
  const u = user.toObject ? user.toObject() : user;
  return {
    ...u,
    followersCount: u.followers?.length || 0,
    followingCount: u.following?.length || 0,
    isFollowing: u.followers?.some(id => id.toString() === currentUserId?.toString()) || false,
    isMe: u._id.toString() === currentUserId?.toString(),
    followers: undefined,
    following: undefined,
  };
};

exports.getProfile = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ username: req.params.username.toLowerCase(), isActive: true }).select(SAFE_FIELDS);
  if (!user) return next(new AppError('User not found.', 404));
  const postsCount = await Post.countDocuments({ author: user._id, isDeleted: false, visibility: 'public' });
  sendSuccess(res, { data: { user: { ...formatUser(user, req.user._id), postsCount } } });
});

exports.updateProfile = catchAsync(async (req, res, next) => {
  const allowed = ['fullName', 'bio', 'interests', 'skills', 'avatarUrl', 'coverUrl', 'isAnonymousModeEnabled', 'notificationPrefs'];
  const updates = {};
  allowed.forEach(field => { if (req.body[field] !== undefined) updates[field] = req.body[field]; });
  if (updates.bio && updates.bio.length > 160) return next(new AppError('Bio cannot exceed 160 characters.', 400));
  if (req.body.username) {
    const username = req.body.username.toLowerCase().trim();
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return next(new AppError('Username can only contain letters, numbers, and underscores.', 400));
    const taken = await User.findOne({ username, _id: { $ne: req.user._id } });
    if (taken) return next(new AppError('That username is already taken.', 409));
    updates.username = username;
  }
  const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true, runValidators: true }).select(SAFE_FIELDS);
  sendSuccess(res, { message: 'Profile updated successfully.', data: { user: formatUser(user, req.user._id) } });
});

exports.toggleFollow = catchAsync(async (req, res, next) => {
  const targetUser = await User.findOne({ username: req.params.username.toLowerCase(), isActive: true });
  if (!targetUser) return next(new AppError('User not found.', 404));
  if (targetUser._id.toString() === req.user._id.toString()) return next(new AppError('You cannot follow yourself.', 400));
  const isFollowing = targetUser.followers.some(id => id.toString() === req.user._id.toString());
  if (isFollowing) {
    await User.findByIdAndUpdate(targetUser._id, { $pull: { followers: req.user._id } });
    await User.findByIdAndUpdate(req.user._id, { $pull: { following: targetUser._id } });
  } else {
    await User.findByIdAndUpdate(targetUser._id, { $addToSet: { followers: req.user._id } });
    await User.findByIdAndUpdate(req.user._id, { $addToSet: { following: targetUser._id } });
    await createAndEmit({
      io: req.io,
      recipientId: targetUser._id,
      actorId: req.user._id,
      type: 'follow',
      targetModel: 'User',
      targetId: req.user._id,
      targetThumbnail: req.user.avatarUrl || null, // ← follower's avatar as "thumbnail"
      message: `${req.user.fullName} started following you`,
    });
  }
  sendSuccess(res, { message: isFollowing ? 'Unfollowed successfully.' : 'Followed successfully.', data: { isFollowing: !isFollowing } });
});

exports.getFollowers = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ username: req.params.username.toLowerCase() })
    .select('followers').populate('followers', 'fullName username avatarUrl department level faculty isVerified');
  if (!user) return next(new AppError('User not found.', 404));
  sendSuccess(res, { data: { followers: user.followers, count: user.followers.length } });
});

exports.getFollowing = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ username: req.params.username.toLowerCase() })
    .select('following').populate('following', 'fullName username avatarUrl department level faculty isVerified');
  if (!user) return next(new AppError('User not found.', 404));
  sendSuccess(res, { data: { following: user.following, count: user.following.length } });
});

exports.searchUsers = catchAsync(async (req, res, next) => {
  const { q, page = 1, limit = 20 } = req.query;
  if (!q?.trim()) return next(new AppError('Search query is required.', 400));
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const regex = new RegExp(q.trim(), 'i');
  const users = await User.find({ isActive: true, $or: [{ fullName: regex }, { username: regex }, { department: regex }, { faculty: regex }] })
    .select('fullName username avatarUrl department faculty level badges isVerified followers').skip(skip).limit(parseInt(limit)).lean();
  sendSuccess(res, { data: { users: users.map(u => ({ ...u, followersCount: u.followers?.length || 0, isFollowing: u.followers?.some(id => id.toString() === req.user._id.toString()) || false, followers: undefined })) } });
});

exports.getSuggestions = catchAsync(async (req, res, next) => {
  const me = await User.findById(req.user._id).select('following department faculty');
  const suggestions = await User.find({ _id: { $ne: req.user._id, $nin: me.following }, isActive: true, $or: [{ department: me.department }, { faculty: me.faculty }] })
    .select('fullName username avatarUrl department level faculty isVerified followers').limit(6).lean();
  sendSuccess(res, { data: { suggestions: suggestions.map(u => ({ ...u, followersCount: u.followers?.length || 0, isFollowing: false, followers: undefined })) } });
});
