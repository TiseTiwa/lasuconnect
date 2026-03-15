const mongoose = require('mongoose');

const announcementCommentSchema = new mongoose.Schema(
  {
    announcement: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Announcement',
      required: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

announcementCommentSchema.index({ announcement: 1, createdAt: 1 });

const AnnouncementComment = mongoose.model('AnnouncementComment', announcementCommentSchema);
module.exports = AnnouncementComment;
