const Post = require('../../models/Post');
const Comment = require('../../models/Comment');
const User = require('../../models/User');
const catchAsync = require('../../utils/catchAsync');
const AppError = require('../../utils/AppError');
const { sendSuccess } = require('../../utils/apiResponse');
const { createAndEmit } = require('../../utils/notificationHelper'); // ← clean import

const AUTHOR_SELECT = 'fullName username avatarUrl faculty department level role badges';

const formatPost = (post, currentUserId) => {
  const p = post.toObject ? post.toObject() : post;
  return {
    ...p,
    isLiked: p.likes?.some(id => id.toString() === currentUserId.toString()) || false,
    author: p.isAnonymous
      ? { fullName: 'Anonymous', username: 'anonymous', avatarUrl: '', _id: null }
      : p.author,
  };
};

exports.createPost = catchAsync(async (req, res, next) => {
  const { content, feedType, tags, visibility, isAnonymous, mediaUrls, mediaType } = req.body;
  if (!content?.trim() && (!mediaUrls || mediaUrls.length === 0)) {
    return next(new AppError('Post must have content or media.', 400));
  }
  const post = await Post.create({
    author: req.user._id,
    content: content?.trim() || '',
    feedType: feedType || 'social',
    tags: tags || [],
    visibility: visibility || 'public',
    isAnonymous: isAnonymous || false,
    mediaUrls: mediaUrls || [],
    mediaType: mediaType || 'text',
  });
  await post.populate('author', AUTHOR_SELECT);
  sendSuccess(res, { statusCode: 201, message: 'Post created successfully.', data: { post: formatPost(post, req.user._id) } });
});

exports.getFeed = catchAsync(async (req, res, next) => {
  const { feedType, page = 1, limit = 15 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const query = { isDeleted: false };
  if (feedType && ['social', 'academic'].includes(feedType)) query.feedType = feedType;
  const user = await User.findById(req.user._id).select('following department faculty');
  const followingIds = user.following || [];
  query.$or = [
    { visibility: 'public' },
    { visibility: 'followers', author: { $in: [...followingIds, req.user._id] } },
    { author: req.user._id },
  ];
  const [posts, total] = await Promise.all([
    Post.find(query).populate('author', AUTHOR_SELECT).sort({ isPinned: -1, createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
    Post.countDocuments(query),
  ]);
  sendSuccess(res, {
    data: { posts: posts.map(p => formatPost(p, req.user._id)) },
    meta: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)), hasMore: skip + posts.length < total },
  });
});

exports.getPost = catchAsync(async (req, res, next) => {
  const post = await Post.findOne({ _id: req.params.id, isDeleted: false }).populate('author', AUTHOR_SELECT);
  if (!post) return next(new AppError('Post not found.', 404));
  sendSuccess(res, { data: { post: formatPost(post, req.user._id) } });
});

exports.updatePost = catchAsync(async (req, res, next) => {
  const post = await Post.findOne({ _id: req.params.id, isDeleted: false });
  if (!post) return next(new AppError('Post not found.', 404));
  if (post.author.toString() !== req.user._id.toString()) return next(new AppError('You can only edit your own posts.', 403));
  const { content, tags, visibility, feedType } = req.body;
  if (content !== undefined) post.content = content.trim();
  if (tags !== undefined) post.tags = tags;
  if (visibility !== undefined) post.visibility = visibility;
  if (feedType !== undefined) post.feedType = feedType;
  await post.save();
  await post.populate('author', AUTHOR_SELECT);
  sendSuccess(res, { message: 'Post updated.', data: { post: formatPost(post, req.user._id) } });
});

exports.deletePost = catchAsync(async (req, res, next) => {
  const post = await Post.findOne({ _id: req.params.id, isDeleted: false });
  if (!post) return next(new AppError('Post not found.', 404));
  const isAuthor = post.author.toString() === req.user._id.toString();
  const isAdmin = ['admin', 'super_admin'].includes(req.user.role);
  if (!isAuthor && !isAdmin) return next(new AppError('You can only delete your own posts.', 403));
  post.isDeleted = true;
  await post.save();
  sendSuccess(res, { message: 'Post deleted.' });
});

exports.toggleLike = catchAsync(async (req, res, next) => {
  const post = await Post.findOne({ _id: req.params.id, isDeleted: false });
  if (!post) return next(new AppError('Post not found.', 404));
  const userId = req.user._id;
  const alreadyLiked = post.likes.some(id => id.toString() === userId.toString());
  if (alreadyLiked) {
    post.likes.pull(userId);
  } else {
    post.likes.push(userId);
    // Pass first media URL as thumbnail so notification shows the post image
    await createAndEmit({
      io: req.io,
      recipientId: post.author,
      actorId: req.user._id,
      type: 'like',
      targetModel: 'Post',
      targetId: post._id,
      targetThumbnail: post.mediaUrls?.[0] || null, // ← post image thumbnail
      message: `${req.user.fullName} liked your post`,
    });
  }
  await post.save();
  sendSuccess(res, { data: { liked: !alreadyLiked, likesCount: post.likesCount } });
});

exports.getComments = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const post = await Post.findOne({ _id: req.params.id, isDeleted: false });
  if (!post) return next(new AppError('Post not found.', 404));
  const [comments, total] = await Promise.all([
    Comment.find({ post: req.params.id, isDeleted: false, parentComment: null })
      .populate('author', AUTHOR_SELECT).sort({ createdAt: 1 }).skip(skip).limit(parseInt(limit)).lean(),
    Comment.countDocuments({ post: req.params.id, isDeleted: false, parentComment: null }),
  ]);
  sendSuccess(res, {
    data: { comments: comments.map(c => ({ ...c, isLiked: c.likes?.some(id => id.toString() === req.user._id.toString()) || false })) },
    meta: { total, page: parseInt(page), hasMore: skip + comments.length < total },
  });
});

exports.addComment = catchAsync(async (req, res, next) => {
  const { content, parentComment } = req.body;
  if (!content?.trim()) return next(new AppError('Comment cannot be empty.', 400));
  const post = await Post.findOne({ _id: req.params.id, isDeleted: false });
  if (!post) return next(new AppError('Post not found.', 404));
  const comment = await Comment.create({
    post: req.params.id,
    author: req.user._id,
    content: content.trim(),
    parentComment: parentComment || null,
  });
  await Post.findByIdAndUpdate(req.params.id, { $inc: { commentsCount: 1 } });
  await comment.populate('author', AUTHOR_SELECT);
  await createAndEmit({
    io: req.io,
    recipientId: post.author,
    actorId: req.user._id,
    type: 'comment',
    targetModel: 'Post',
    targetId: post._id,
    targetThumbnail: post.mediaUrls?.[0] || null, // ← post image thumbnail
    message: `${req.user.fullName} commented on your post`,
  });
  sendSuccess(res, { statusCode: 201, message: 'Comment added.', data: { comment } });
});

exports.deleteComment = catchAsync(async (req, res, next) => {
  const comment = await Comment.findById(req.params.commentId);
  if (!comment || comment.isDeleted) return next(new AppError('Comment not found.', 404));
  const isAuthor = comment.author.toString() === req.user._id.toString();
  const isAdmin = ['admin', 'super_admin'].includes(req.user.role);
  if (!isAuthor && !isAdmin) return next(new AppError('You cannot delete this comment.', 403));
  comment.isDeleted = true;
  await comment.save();
  await Post.findByIdAndUpdate(req.params.id, { $inc: { commentsCount: -1 } });
  sendSuccess(res, { message: 'Comment deleted.' });
});

exports.getUserPosts = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 15 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const targetUser = await User.findOne({ username: req.params.username });
  if (!targetUser) return next(new AppError('User not found.', 404));
  const [posts, total] = await Promise.all([
    Post.find({ author: targetUser._id, isDeleted: false, visibility: 'public' })
      .populate('author', AUTHOR_SELECT).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
    Post.countDocuments({ author: targetUser._id, isDeleted: false, visibility: 'public' }),
  ]);
  sendSuccess(res, {
    data: { posts: posts.map(p => formatPost(p, req.user._id)) },
    meta: { total, page: parseInt(page), hasMore: skip + posts.length < total },
  });
});

exports.toggleCommentLike = catchAsync(async (req, res, next) => {
  const comment = await Comment.findById(req.params.commentId);
  if (!comment || comment.isDeleted) return next(new AppError('Comment not found.', 404));
  const userId = req.user._id;
  const alreadyLiked = comment.likes.some(id => id.toString() === userId.toString());
  if (alreadyLiked) comment.likes.pull(userId);
  else comment.likes.push(userId);
  await comment.save();
  sendSuccess(res, { data: { liked: !alreadyLiked, likesCount: comment.likesCount } });
});
