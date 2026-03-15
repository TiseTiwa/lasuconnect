const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Post must have an author'],
    },
    content: {
      type: String,
      maxlength: [2000, 'Post content cannot exceed 2000 characters'],
      default: '',
    },
    mediaUrls: [{ type: String }],
    mediaType: {
      type: String,
      enum: ['image', 'video', 'mixed', 'text', null],
      default: 'text',
    },
    feedType: {
      type: String,
      enum: ['social', 'academic'],
      default: 'social',
    },
    tags: [{ type: String, trim: true, lowercase: true }],
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      default: null,
    },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    likesCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    sharesCount: { type: Number, default: 0 },
    isAnonymous: { type: Boolean, default: false },
    isPinned: { type: Boolean, default: false },
    visibility: {
      type: String,
      enum: ['public', 'followers', 'department', 'faculty', 'private'],
      default: 'public',
    },
    isDeleted: { type: Boolean, default: false },
    reportCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Indexes ────────────────────────────────────────────────
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ feedType: 1, createdAt: -1 });
postSchema.index({ tags: 1 });
postSchema.index({ isDeleted: 1, createdAt: -1 });
postSchema.index({ course: 1, createdAt: -1 });

// ── Auto-sync likesCount with likes array ─────────────────
postSchema.pre('save', function (next) {
  if (this.isModified('likes')) {
    this.likesCount = this.likes.length;
  }
  next();
});

const Post = mongoose.model('Post', postSchema);
module.exports = Post;
