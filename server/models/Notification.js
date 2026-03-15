const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    type: {
      type: String,
      enum: [
        'like', 'comment', 'follow', 'mention',
        'message', 'announcement', 'live_start',
        'tutoring_request', 'reel_like', 'reel_comment',
      ],
      required: true,
    },
    targetModel: {
      type: String,
      enum: ['Post', 'Reel', 'Comment', 'LiveStream', 'User', null],
      default: null,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    // ← NEW: stores the post/reel image URL for thumbnail preview
    targetThumbnail: {
      type: String,
      default: null,
    },
    message: {
      type: String,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;
