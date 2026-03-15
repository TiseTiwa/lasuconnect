const User = require('../../models/User');
const catchAsync = require('../../utils/catchAsync');
const AppError = require('../../utils/AppError');
const { sendSuccess } = require('../../utils/apiResponse');
const { uploadToCloudinary, deleteFromCloudinary, getPublicIdFromUrl } = require('../../utils/cloudinaryUpload');

// ────────────────────────────────────────────────────────────
//  POST /api/media/avatar  — Upload profile picture
// ────────────────────────────────────────────────────────────
exports.uploadAvatar = catchAsync(async (req, res, next) => {
  if (!req.file) return next(new AppError('Please provide an image file.', 400));

  // Delete old avatar from Cloudinary if exists
  const user = await User.findById(req.user._id);
  if (user.avatarUrl) {
    const oldPublicId = getPublicIdFromUrl(user.avatarUrl);
    if (oldPublicId) await deleteFromCloudinary(oldPublicId);
  }

  // Upload new avatar with transformations
  const result = await uploadToCloudinary(req.file.buffer, {
    folder: 'lasuconnect/avatars',
    resource_type: 'image',
    transformation: [
      { width: 400, height: 400, crop: 'fill', gravity: 'face' }, // Square crop focused on face
      { quality: 'auto', fetch_format: 'auto' },                   // Auto optimize
    ],
    public_id: `avatar_${req.user._id}`, // Consistent ID so old files get replaced
    overwrite: true,
  });

  // Save URL to user document
  user.avatarUrl = result.secure_url;
  await user.save({ validateBeforeSave: false });

  sendSuccess(res, {
    message: 'Profile picture updated successfully.',
    data: { avatarUrl: result.secure_url },
  });
});

// ────────────────────────────────────────────────────────────
//  POST /api/media/cover  — Upload cover photo
// ────────────────────────────────────────────────────────────
exports.uploadCover = catchAsync(async (req, res, next) => {
  if (!req.file) return next(new AppError('Please provide an image file.', 400));

  const user = await User.findById(req.user._id);

  // Delete old cover
  if (user.coverUrl) {
    const oldPublicId = getPublicIdFromUrl(user.coverUrl);
    if (oldPublicId) await deleteFromCloudinary(oldPublicId);
  }

  // Upload cover — wide banner format
  const result = await uploadToCloudinary(req.file.buffer, {
    folder: 'lasuconnect/covers',
    resource_type: 'image',
    transformation: [
      { width: 1200, height: 400, crop: 'fill', gravity: 'center' },
      { quality: 'auto', fetch_format: 'auto' },
    ],
    public_id: `cover_${req.user._id}`,
    overwrite: true,
  });

  user.coverUrl = result.secure_url;
  await user.save({ validateBeforeSave: false });

  sendSuccess(res, {
    message: 'Cover photo updated successfully.',
    data: { coverUrl: result.secure_url },
  });
});

// ────────────────────────────────────────────────────────────
//  POST /api/media/post  — Upload image(s) for a post
// ────────────────────────────────────────────────────────────
exports.uploadPostMedia = catchAsync(async (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return next(new AppError('Please provide at least one file.', 400));
  }

  if (req.files.length > 4) {
    return next(new AppError('Maximum 4 images per post.', 400));
  }

  // Upload all files in parallel
  const uploadPromises = req.files.map((file, index) =>
    uploadToCloudinary(file.buffer, {
      folder: 'lasuconnect/posts',
      resource_type: file.mimetype.startsWith('video/') ? 'video' : 'image',
      transformation: file.mimetype.startsWith('image/')
        ? [{ width: 1080, crop: 'limit' }, { quality: 'auto', fetch_format: 'auto' }]
        : [],
    })
  );

  const results = await Promise.all(uploadPromises);
  const mediaUrls = results.map(r => r.secure_url);
  const mediaType = req.files.every(f => f.mimetype.startsWith('video/'))
    ? 'video'
    : req.files.every(f => f.mimetype.startsWith('image/'))
    ? 'image'
    : 'mixed';

  sendSuccess(res, {
    message: 'Media uploaded successfully.',
    data: { mediaUrls, mediaType },
  });
});

// ────────────────────────────────────────────────────────────
//  POST /api/media/document  — Upload PDF for course resources
// ────────────────────────────────────────────────────────────
exports.uploadDocument = catchAsync(async (req, res, next) => {
  if (!req.file) return next(new AppError('Please provide a file.', 400));

  const result = await uploadToCloudinary(req.file.buffer, {
    folder: 'lasuconnect/documents',
    resource_type: 'raw', // PDFs use 'raw' in Cloudinary
    use_filename: true,
    unique_filename: true,
  });

  sendSuccess(res, {
    message: 'Document uploaded successfully.',
    data: {
      fileUrl: result.secure_url,
      fileType: req.file.mimetype,
      fileName: req.file.originalname,
    },
  });
});
