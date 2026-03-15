const mongoose = require('mongoose');

const liveStreamSchema = new mongoose.Schema(
  {
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Stream title is required'],
      trim: true,
      maxlength: 150,
    },
    description: {
      type: String,
      default: '',
      maxlength: 500,
      trim: true,
    },
    category: {
      type: String,
      enum: ['lecture', 'discussion', 'event', 'tutorial', 'general'],
      default: 'general',
    },
    status: {
      type: String,
      enum: ['scheduled', 'live', 'ended'],
      default: 'scheduled',
    },
    scheduledFor: {
      type: Date,
      default: null,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    endedAt: {
      type: Date,
      default: null,
    },
    thumbnailUrl: {
      type: String,
      default: '',
    },
    viewerCount: {
      type: Number,
      default: 0,
    },
    peakViewers: {
      type: Number,
      default: 0,
    },
    totalViewers: {
      type: Number,
      default: 0,
    },
    // Who has viewed
    viewers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    // Tags for discoverability
    tags: [{ type: String, trim: true, lowercase: true }],
    // Is this stream restricted to dept/faculty?
    visibility: {
      type: String,
      enum: ['public', 'department', 'faculty'],
      default: 'public',
    },
    targetDepartment: { type: String, default: null },
    targetFaculty:    { type: String, default: null },
  },
  { timestamps: true }
);

liveStreamSchema.index({ status: 1, createdAt: -1 });
liveStreamSchema.index({ host: 1, status: 1 });
liveStreamSchema.index({ scheduledFor: 1 });

const LiveStream = mongoose.model('LiveStream', liveStreamSchema);
module.exports = LiveStream;
