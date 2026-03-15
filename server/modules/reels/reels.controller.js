const Reel = require("../../models/Reel");
const Comment = require("../../models/Comment");
const catchAsync = require("../../utils/catchAsync");
const AppError = require("../../utils/AppError");
const { sendSuccess } = require("../../utils/apiResponse");
const {
  uploadToCloudinary,
  deleteFromCloudinary,
} = require("../../utils/cloudinaryUpload");
const { createAndEmit } = require("../../utils/notificationHelper"); // ← fixed import

const AUTHOR_SELECT = "fullName username avatarUrl department level";

const formatReel = (reel, currentUserId) => {
  const r = reel.toObject ? reel.toObject() : reel;
  return {
    ...r,
    isLiked:
      r.likes?.some((id) => id.toString() === currentUserId?.toString()) ||
      false,
  };
};

exports.uploadReel = catchAsync(async (req, res, next) => {
  if (!req.file) return next(new AppError("Please provide a video file.", 400));
  const { caption, sound, tags } = req.body;
  const result = await uploadToCloudinary(req.file.buffer, {
    folder: "lasuconnect/reels",
    resource_type: "video",
    transformation: [{ width: 720, crop: "limit" }, { quality: "auto" }],
    eager: [
      {
        format: "jpg",
        transformation: [{ width: 720, height: 1280, crop: "fill" }],
      },
    ],
    eager_async: false,
  });
  const reel = await Reel.create({
    author: req.user._id,
    videoUrl: result.secure_url,
    thumbnailUrl: result.eager?.[0]?.secure_url || "",
    caption: caption?.trim() || "",
    sound: sound?.trim() || "Original Audio",
    duration: Math.round(result.duration || 0),
    tags: tags
      ? tags
          .split(",")
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean)
      : [],
    cloudinaryPublicId: result.public_id,
  });
  await reel.populate("author", AUTHOR_SELECT);
  sendSuccess(res, {
    statusCode: 201,
    message: "Reel uploaded successfully!",
    data: { reel: formatReel(reel, req.user._id) },
  });
});

exports.getReels = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [reels, total] = await Promise.all([
    Reel.find({ isDeleted: false })
      .populate("author", AUTHOR_SELECT)
      .sort({ isTrending: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Reel.countDocuments({ isDeleted: false }),
  ]);
  const reelIds = reels.map((r) => r._id);
  await Reel.updateMany({ _id: { $in: reelIds } }, { $inc: { views: 1 } });
  sendSuccess(res, {
    data: { reels: reels.map((r) => formatReel(r, req.user._id)) },
    meta: { total, page: parseInt(page), hasMore: skip + reels.length < total },
  });
});

exports.getTrending = catchAsync(async (req, res, next) => {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const reels = await Reel.find({
    isDeleted: false,
    createdAt: { $gte: oneWeekAgo },
  })
    .populate("author", AUTHOR_SELECT)
    .sort({ likesCount: -1, views: -1 })
    .limit(10)
    .lean();
  sendSuccess(res, {
    data: { reels: reels.map((r) => formatReel(r, req.user._id)) },
  });
});

exports.toggleLike = catchAsync(async (req, res, next) => {
  const reel = await Reel.findOne({ _id: req.params.id, isDeleted: false });
  if (!reel) return next(new AppError("Reel not found.", 404));
  const userId = req.user._id;
  const alreadyLiked = reel.likes.some(
    (id) => id.toString() === userId.toString(),
  );
  if (alreadyLiked) {
    reel.likes.pull(userId);
  } else {
    reel.likes.push(userId);
    // ✅ Now saves to DB + uses correct type 'reel_like' + passes thumbnail
    await createAndEmit({
      io: req.io,
      recipientId: reel.author,
      actorId: req.user._id,
      type: "reel_like", // ← correct type
      targetModel: "Reel",
      targetId: reel._id,
      targetThumbnail: reel.thumbnailUrl || null, // ← reel thumbnail
      message: `${req.user.fullName} liked your reel`,
    });
  }
  await reel.save();
  sendSuccess(res, {
    data: { liked: !alreadyLiked, likesCount: reel.likesCount },
  });
});

exports.getComments = catchAsync(async (req, res, next) => {
  const comments = await Comment.find({
    post: req.params.id,
    isDeleted: false,
    parentComment: null,
  })
    .populate("author", AUTHOR_SELECT)
    .sort({ createdAt: 1 })
    .limit(50)
    .lean();
  sendSuccess(res, { data: { comments } });
});

exports.addComment = catchAsync(async (req, res, next) => {
  const { content } = req.body;
  if (!content?.trim())
    return next(new AppError("Comment cannot be empty.", 400));
  const reel = await Reel.findOne({ _id: req.params.id, isDeleted: false });
  if (!reel) return next(new AppError("Reel not found.", 404));
  const comment = await Comment.create({
    post: req.params.id,
    author: req.user._id,
    content: content.trim(),
  });
  await Reel.findByIdAndUpdate(req.params.id, { $inc: { commentsCount: 1 } });
  await comment.populate("author", AUTHOR_SELECT);
  // ✅ Now saves to DB + uses correct type 'reel_comment' + passes thumbnail
  await createAndEmit({
    io: req.io,
    recipientId: reel.author,
    actorId: req.user._id,
    type: "reel_comment", // ← correct type
    targetModel: "Reel",
    targetId: reel._id,
    targetThumbnail: reel.thumbnailUrl || null, // ← reel thumbnail
    message: `${req.user.fullName} commented on your reel`,
  });
  sendSuccess(res, { statusCode: 201, data: { comment } });
});

exports.deleteReel = catchAsync(async (req, res, next) => {
  const reel = await Reel.findOne({ _id: req.params.id, isDeleted: false });
  if (!reel) return next(new AppError("Reel not found.", 404));
  const isAuthor = reel.author.toString() === req.user._id.toString();
  const isAdmin = ["admin", "super_admin"].includes(req.user.role);
  if (!isAuthor && !isAdmin)
    return next(new AppError("You cannot delete this reel.", 403));
  if (reel.cloudinaryPublicId)
    await deleteFromCloudinary(reel.cloudinaryPublicId, "video");
  reel.isDeleted = true;
  await reel.save();
  sendSuccess(res, { message: "Reel deleted." });
});
exports.getUserReels = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 12 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const User = require("../../models/User");
  const targetUser = await User.findOne({
    username: req.params.username.toLowerCase(),
  });
  if (!targetUser) return next(new AppError("User not found.", 404));
  const [reels, total] = await Promise.all([
    Reel.find({ author: targetUser._id, isDeleted: false })
      .populate("author", AUTHOR_SELECT)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Reel.countDocuments({ author: targetUser._id, isDeleted: false }),
  ]);
  sendSuccess(res, {
    data: { reels: reels.map((r) => formatReel(r, req.user._id)) },
    meta: { total, page: parseInt(page), hasMore: skip + reels.length < total },
  });
});
