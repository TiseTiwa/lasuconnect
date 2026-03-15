const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema(
  {
    courseCode: {
      type: String,
      required: [true, 'Course code is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    courseTitle: {
      type: String,
      required: [true, 'Course title is required'],
      trim: true,
    },
    faculty: {
      type: String,
      required: true,
      trim: true,
    },
    department: {
      type: String,
      required: true,
      trim: true,
    },
    level: {
      type: String,
      enum: ['100', '200', '300', '400', '500'],
      required: true,
    },
    semester: {
      type: String,
      enum: ['first', 'second'],
      required: true,
    },
    units: {
      type: Number,
      default: 2,
    },
    courseRep: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    lecturers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    members: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    description: {
      type: String,
      default: '',
      maxlength: 500,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

courseSchema.index({ faculty: 1, department: 1, level: 1 });
courseSchema.index({ courseCode: 1 });

const Course = mongoose.model('Course', courseSchema);
module.exports = Course;
