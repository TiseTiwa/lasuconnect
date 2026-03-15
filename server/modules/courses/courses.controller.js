const Course = require('../../models/Course');
const CourseResource = require('../../models/CourseResource');
const Post = require('../../models/Post');
const User = require('../../models/User');
const catchAsync = require('../../utils/catchAsync');
const AppError = require('../../utils/AppError');
const { sendSuccess } = require('../../utils/apiResponse');
const { uploadToCloudinary, deleteFromCloudinary } = require('../../utils/cloudinaryUpload');

const UPLOADER_SELECT = 'fullName username avatarUrl role';

// ────────────────────────────────────────────────────────────
//  GET /api/courses  — List courses (filtered by dept/level)
// ────────────────────────────────────────────────────────────
exports.getCourses = catchAsync(async (req, res, next) => {
  const { department, faculty, level, search, semester } = req.query;

  const query = { isActive: true };
  if (department) query.department = new RegExp(department, 'i');
  if (faculty) query.faculty = new RegExp(faculty, 'i');
  if (level) query.level = level;
  if (semester) query.semester = semester;
  if (search) {
    query.$or = [
      { courseCode: new RegExp(search, 'i') },
      { courseTitle: new RegExp(search, 'i') },
    ];
  }

  const courses = await Course.find(query)
    .populate('courseRep', 'fullName username avatarUrl')
    .sort({ level: 1, courseCode: 1 })
    .lean();

  // Add join status for current user
  const enriched = courses.map(c => ({
    ...c,
    isJoined: c.members?.some(id => id.toString() === req.user._id.toString()) || false,
    membersCount: c.members?.length || 0,
    members: undefined,
  }));

  sendSuccess(res, { data: { courses: enriched } });
});

// ────────────────────────────────────────────────────────────
//  GET /api/courses/my  — Courses the user has joined
// ────────────────────────────────────────────────────────────
exports.getMyCourses = catchAsync(async (req, res, next) => {
  const courses = await Course.find({
    members: req.user._id,
    isActive: true,
  })
    .populate('courseRep', 'fullName username avatarUrl')
    .sort({ level: 1, courseCode: 1 })
    .lean();

  sendSuccess(res, {
    data: {
      courses: courses.map(c => ({
        ...c,
        isJoined: true,
        membersCount: c.members?.length || 0,
        members: undefined,
      })),
    },
  });
});

// ────────────────────────────────────────────────────────────
//  GET /api/courses/suggestions  — Suggest courses by user's dept + level
// ────────────────────────────────────────────────────────────
exports.getSuggestedCourses = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id).select('department faculty level');

  const courses = await Course.find({
    isActive: true,
    members: { $ne: req.user._id },
    $or: [
      { department: new RegExp(user.department, 'i'), level: user.level },
      { faculty: new RegExp(user.faculty, 'i'), level: user.level },
    ],
  })
    .limit(10)
    .lean();

  sendSuccess(res, {
    data: {
      courses: courses.map(c => ({
        ...c,
        isJoined: false,
        membersCount: c.members?.length || 0,
        members: undefined,
      })),
    },
  });
});

// ────────────────────────────────────────────────────────────
//  GET /api/courses/:id  — Get single course hub
// ────────────────────────────────────────────────────────────
exports.getCourse = catchAsync(async (req, res, next) => {
  const course = await Course.findById(req.params.id)
    .populate('courseRep', 'fullName username avatarUrl')
    .populate('lecturers', 'fullName username avatarUrl');

  if (!course) return next(new AppError('Course not found.', 404));

  const isJoined = course.members.some(id => id.toString() === req.user._id.toString());

  // Resource counts by type
  const resourceCounts = await CourseResource.aggregate([
    { $match: { course: course._id, isDeleted: false } },
    { $group: { _id: '$resourceType', count: { $sum: 1 } } },
  ]);

  const counts = {};
  resourceCounts.forEach(r => { counts[r._id] = r.count; });

  sendSuccess(res, {
    data: {
      course: {
        ...course.toObject(),
        isJoined,
        membersCount: course.members.length,
        members: undefined,
        resourceCounts: counts,
      },
    },
  });
});

// ────────────────────────────────────────────────────────────
//  POST /api/courses  — Create a course hub (admin/lecturer only)
// ────────────────────────────────────────────────────────────
exports.createCourse = catchAsync(async (req, res, next) => {
  const { courseCode, courseTitle, faculty, department, level, semester, units, description } = req.body;

  const existing = await Course.findOne({ courseCode: courseCode?.toUpperCase() });
  if (existing) return next(new AppError('A hub for this course already exists.', 409));

  const course = await Course.create({
    courseCode, courseTitle, faculty, department,
    level, semester, units: units || 2,
    description: description || '',
    members: [req.user._id], // creator auto-joins
  });

  sendSuccess(res, { statusCode: 201, data: { course } });
});

// ────────────────────────────────────────────────────────────
//  POST /api/courses/:id/join  — Join or leave a course
// ────────────────────────────────────────────────────────────
exports.toggleJoin = catchAsync(async (req, res, next) => {
  const course = await Course.findById(req.params.id);
  if (!course) return next(new AppError('Course not found.', 404));

  const isJoined = course.members.some(id => id.toString() === req.user._id.toString());

  if (isJoined) {
    course.members.pull(req.user._id);
  } else {
    course.members.push(req.user._id);
  }

  await course.save();

  sendSuccess(res, {
    message: isJoined ? 'Left course hub.' : 'Joined course hub!',
    data: { isJoined: !isJoined, membersCount: course.members.length },
  });
});

// ────────────────────────────────────────────────────────────
//  GET /api/courses/:id/resources  — Get resources for a course
// ────────────────────────────────────────────────────────────
exports.getResources = catchAsync(async (req, res, next) => {
  const { type, page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const query = { course: req.params.id, isDeleted: false };
  if (type) query.resourceType = type;

  const [resources, total] = await Promise.all([
    CourseResource.find(query)
      .populate('uploadedBy', UPLOADER_SELECT)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    CourseResource.countDocuments(query),
  ]);

  const enriched = resources.map(r => ({
    ...r,
    isLiked: r.likes?.some(id => id.toString() === req.user._id.toString()) || false,
    likes: undefined,
  }));

  sendSuccess(res, {
    data: { resources: enriched },
    meta: { total, page: parseInt(page), hasMore: skip + resources.length < total },
  });
});

// ────────────────────────────────────────────────────────────
//  POST /api/courses/:id/resources  — Upload a resource
// ────────────────────────────────────────────────────────────
exports.uploadResource = catchAsync(async (req, res, next) => {
  if (!req.file) return next(new AppError('Please provide a file.', 400));

  const { title, description, resourceType, academicYear } = req.body;
  if (!title?.trim()) return next(new AppError('Resource title is required.', 400));
  if (!resourceType) return next(new AppError('Resource type is required.', 400));

  const course = await Course.findById(req.params.id);
  if (!course) return next(new AppError('Course not found.', 404));

  // Upload to Cloudinary
  const isPDF = req.file.mimetype === 'application/pdf';
  const result = await uploadToCloudinary(req.file.buffer, {
    folder: `lasuconnect/courses/${course.courseCode}`,
    resource_type: isPDF ? 'raw' : 'image',
    use_filename: true,
    unique_filename: true,
  });

  const resource = await CourseResource.create({
    course: req.params.id,
    uploadedBy: req.user._id,
    resourceType,
    title: title.trim(),
    description: description?.trim() || '',
    fileUrl: result.secure_url,
    fileType: req.file.mimetype,
    fileSize: req.file.size,
    cloudinaryPublicId: result.public_id,
    academicYear: academicYear?.trim() || '',
  });

  await resource.populate('uploadedBy', UPLOADER_SELECT);

  sendSuccess(res, {
    statusCode: 201,
    message: 'Resource uploaded successfully!',
    data: { resource },
  });
});

// ────────────────────────────────────────────────────────────
//  POST /api/courses/:id/resources/:resourceId/like
// ────────────────────────────────────────────────────────────
exports.toggleResourceLike = catchAsync(async (req, res, next) => {
  const resource = await CourseResource.findOne({
    _id: req.params.resourceId,
    course: req.params.id,
    isDeleted: false,
  });
  if (!resource) return next(new AppError('Resource not found.', 404));

  const isLiked = resource.likes.some(id => id.toString() === req.user._id.toString());
  if (isLiked) resource.likes.pull(req.user._id);
  else resource.likes.push(req.user._id);

  await resource.save();
  sendSuccess(res, { data: { isLiked: !isLiked, likesCount: resource.likesCount } });
});

// ────────────────────────────────────────────────────────────
//  DELETE /api/courses/:id/resources/:resourceId
// ────────────────────────────────────────────────────────────
exports.deleteResource = catchAsync(async (req, res, next) => {
  const resource = await CourseResource.findOne({
    _id: req.params.resourceId,
    course: req.params.id,
    isDeleted: false,
  });
  if (!resource) return next(new AppError('Resource not found.', 404));

  const isOwner = resource.uploadedBy.toString() === req.user._id.toString();
  const isAdmin = ['admin', 'super_admin'].includes(req.user.role);
  if (!isOwner && !isAdmin) return next(new AppError('You cannot delete this resource.', 403));

  if (resource.cloudinaryPublicId) {
    await deleteFromCloudinary(resource.cloudinaryPublicId, 'raw');
  }

  resource.isDeleted = true;
  await resource.save();

  sendSuccess(res, { message: 'Resource deleted.' });
});

// ────────────────────────────────────────────────────────────
//  GET /api/courses/:id/discussions  — Get discussion posts
// ────────────────────────────────────────────────────────────
exports.getDiscussions = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 15 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [posts, total] = await Promise.all([
    Post.find({ course: req.params.id, isDeleted: false })
      .populate('author', 'fullName username avatarUrl department level role')
      .sort({ isPinned: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Post.countDocuments({ course: req.params.id, isDeleted: false }),
  ]);

  const enriched = posts.map(p => ({
    ...p,
    isLiked: p.likes?.some(id => id.toString() === req.user._id.toString()) || false,
  }));

  sendSuccess(res, {
    data: { posts: enriched },
    meta: { total, page: parseInt(page), hasMore: skip + posts.length < total },
  });
});

// ────────────────────────────────────────────────────────────
//  POST /api/courses/:id/discussions  — Post to course discussion
// ────────────────────────────────────────────────────────────
exports.postDiscussion = catchAsync(async (req, res, next) => {
  const { content, tags } = req.body;
  if (!content?.trim()) return next(new AppError('Post content is required.', 400));

  const course = await Course.findById(req.params.id);
  if (!course) return next(new AppError('Course not found.', 404));

  const post = await Post.create({
    author: req.user._id,
    content: content.trim(),
    feedType: 'academic',
    course: req.params.id,
    tags: tags || [course.courseCode.toLowerCase()],
    visibility: 'public',
  });

  await post.populate('author', 'fullName username avatarUrl department level role');

  sendSuccess(res, {
    statusCode: 201,
    data: {
      post: { ...post.toObject(), isLiked: false },
    },
  });
});

// ────────────────────────────────────────────────────────────
//  PATCH /api/courses/:id/increment-download/:resourceId
// ────────────────────────────────────────────────────────────
exports.incrementDownload = catchAsync(async (req, res, next) => {
  await CourseResource.findByIdAndUpdate(req.params.resourceId, {
    $inc: { downloadsCount: 1 },
  });
  sendSuccess(res, { message: 'Download recorded.' });
});
