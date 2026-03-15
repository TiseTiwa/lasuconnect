const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Announcement title is required'],
      trim: true,
      maxlength: 200,
    },
    content: {
      type: String,
      required: [true, 'Announcement content is required'],
      trim: true,
      maxlength: 5000,
    },
    // Who sees this announcement
    scope: {
      type: String,
      enum: ['university', 'faculty', 'department', 'course', 'level'],
      required: true,
    },
    targetFaculty: {
      type: String,
      default: null,
      trim: true,
    },
    targetDepartment: {
      type: String,
      default: null,
      trim: true,
    },
    targetLevel: {
      type: String,
      enum: ['100', '200', '300', '400', '500', null],
      default: null,
    },
    targetCourse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      default: null,
    },
    // Priority
    priority: {
      type: String,
      enum: ['normal', 'important', 'urgent'],
      default: 'normal',
    },
    mediaUrl: {
      type: String,
      default: null,
    },
    attachmentUrl: {
      type: String,
      default: null,
    },
    attachmentName: {
      type: String,
      default: null,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    readBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

announcementSchema.index({ scope: 1, createdAt: -1 });
announcementSchema.index({ targetFaculty: 1, targetDepartment: 1 });
announcementSchema.index({ isPinned: -1, createdAt: -1 });
announcementSchema.index({ isDeleted: 1, createdAt: -1 });

const Announcement = mongoose.model('Announcement', announcementSchema);
module.exports = Announcement;
