const mongoose = require('mongoose');

const reelSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    videoUrl: {
      type: String,
      required: [true, 'Reel must have a video'],
    },
    thumbnailUrl: {
      type: String,
      default: '',
    },
    caption: {
      type: String,
      maxlength: [300, 'Caption cannot exceed 300 characters'],
      default: '',
    },
    sound: {
      type: String,
      default: 'Original Audio',
    },
    duration: {
      type: Number, // seconds
      default: 0,
    },
    tags: [{ type: String, trim: true, lowercase: true }],
    views: { type: Number, default: 0 },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    likesCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    isTrending: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    // Cloudinary public_id for deletion
    cloudinaryPublicId: { type: String, default: '' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

reelSchema.index({ author: 1, createdAt: -1 });
reelSchema.index({ isTrending: 1, createdAt: -1 });
reelSchema.index({ tags: 1 });
reelSchema.index({ isDeleted: 1, createdAt: -1 });

reelSchema.pre('save', function (next) {
  if (this.isModified('likes')) this.likesCount = this.likes.length;
  next();
});

const Reel = mongoose.model('Reel', reelSchema);
module.exports = Reel;
