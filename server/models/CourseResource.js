const mongoose = require('mongoose');

const courseResourceSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    resourceType: {
      type: String,
      enum: ['past_question', 'lecture_note', 'exam_tip', 'textbook', 'assignment', 'other'],
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Resource title is required'],
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      default: '',
      maxlength: 500,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    cloudinaryPublicId: {
      type: String,
      default: '',
    },
    // For past questions - which year
    academicYear: {
      type: String,
      default: '',
      trim: true,
    },
    likes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    likesCount: { type: Number, default: 0 },
    downloadsCount: { type: Number, default: 0 },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

courseResourceSchema.index({ course: 1, resourceType: 1, createdAt: -1 });
courseResourceSchema.index({ uploadedBy: 1 });

courseResourceSchema.pre('save', function (next) {
  if (this.isModified('likes')) this.likesCount = this.likes.length;
  next();
});

const CourseResource = mongoose.model('CourseResource', courseResourceSchema);
module.exports = CourseResource;
