// ─────────────────────────────────────────────────────────
//  notificationHelper.js
//  Standalone helper used by all modules to create + emit
//  notifications without circular dependency issues.
//  Import this in posts, users, reels controllers instead
//  of importing notifications.controller.js directly.
// ─────────────────────────────────────────────────────────
const Notification = require('../models/Notification');
const logger = require('./logger');

const ACTOR_SELECT = 'fullName username avatarUrl';

const createAndEmit = async ({
  io,
  recipientId,
  actorId,
  type,
  targetModel = null,
  targetId = null,
  targetThumbnail = null, // ← image URL for post/reel preview
  message,
}) => {
  try {
    // Never notify yourself
    if (recipientId?.toString() === actorId?.toString()) return;

    const notification = await Notification.create({
      recipient: recipientId,
      actor: actorId || null,
      type,
      targetModel,
      targetId,
      targetThumbnail, // stored on the notification document
      message,
    });

    await notification.populate('actor', ACTOR_SELECT);

    if (io) {
      io.to(`user:${recipientId}`).emit('notification:new', notification);
    }

    return notification;
  } catch (err) {
    logger.error(`Failed to create notification: ${err.message}`);
  }
};

module.exports = { createAndEmit };
