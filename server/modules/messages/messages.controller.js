const Conversation = require('../../models/Conversation');
const Message = require('../../models/Message');
const User = require('../../models/User');
const catchAsync = require('../../utils/catchAsync');
const AppError = require('../../utils/AppError');
const { sendSuccess } = require('../../utils/apiResponse');
const { createAndEmit } = require('../../utils/notificationHelper');

const PARTICIPANT_SELECT = 'fullName username avatarUrl isVerified lastSeen';
const SENDER_SELECT = 'fullName username avatarUrl';

// ── Format conversation for client ───────────────────────
const formatConversation = (conv, currentUserId) => {
  const c = conv.toObject ? conv.toObject() : { ...conv };

  // For direct chats, the "other" participant is the display name
  if (c.type === 'direct') {
    const other = c.participants?.find(
      p => p._id?.toString() !== currentUserId?.toString()
    );
    c.displayName = other?.fullName || 'Unknown';
    c.displayAvatar = other?.avatarUrl || '';
    c.otherUser = other || null;
  } else {
    c.displayName = c.name || 'Group Chat';
    c.displayAvatar = c.avatarUrl || '';
    c.otherUser = null;
  }

  // Unread count for this user
  c.unreadCount = c.unreadCounts?.[currentUserId?.toString()] || 0;
  c.unreadCounts = undefined;

  return c;
};

// ────────────────────────────────────────────────────────────
//  GET /api/messages/conversations  — Get user's inbox
// ────────────────────────────────────────────────────────────
exports.getConversations = catchAsync(async (req, res, next) => {
  const conversations = await Conversation.find({
    participants: req.user._id,
  })
    .populate('participants', PARTICIPANT_SELECT)
    .populate({
      path: 'lastMessage',
      select: 'content mediaType sender createdAt isDeleted',
      populate: { path: 'sender', select: 'fullName username' },
    })
    .sort({ lastMessageAt: -1 })
    .lean();

  sendSuccess(res, {
    data: {
      conversations: conversations.map(c => formatConversation(c, req.user._id)),
    },
  });
});

// ────────────────────────────────────────────────────────────
//  POST /api/messages/conversations  — Start or get a DM
// ────────────────────────────────────────────────────────────
exports.getOrCreateDM = catchAsync(async (req, res, next) => {
  const { userId } = req.body;
  if (!userId) return next(new AppError('User ID is required.', 400));
  if (userId === req.user._id.toString()) return next(new AppError('You cannot message yourself.', 400));

  const targetUser = await User.findById(userId).select(PARTICIPANT_SELECT);
  if (!targetUser) return next(new AppError('User not found.', 404));

  // Check if DM already exists between these two users
  let conversation = await Conversation.findOne({
    type: 'direct',
    participants: { $all: [req.user._id, userId], $size: 2 },
  })
    .populate('participants', PARTICIPANT_SELECT)
    .populate({
      path: 'lastMessage',
      select: 'content mediaType sender createdAt',
    });

  if (!conversation) {
    conversation = await Conversation.create({
      type: 'direct',
      participants: [req.user._id, userId],
      createdBy: req.user._id,
    });
    conversation = await conversation.populate('participants', PARTICIPANT_SELECT);
  }

  sendSuccess(res, {
    data: { conversation: formatConversation(conversation, req.user._id) },
  });
});

// ────────────────────────────────────────────────────────────
//  POST /api/messages/conversations/group  — Create group chat
// ────────────────────────────────────────────────────────────
exports.createGroup = catchAsync(async (req, res, next) => {
  const { name, participantIds, type = 'group' } = req.body;
  if (!name?.trim()) return next(new AppError('Group name is required.', 400));
  if (!participantIds?.length || participantIds.length < 2) {
    return next(new AppError('A group needs at least 2 other participants.', 400));
  }

  const allParticipants = [...new Set([req.user._id.toString(), ...participantIds])];

  const conversation = await Conversation.create({
    type,
    name: name.trim(),
    participants: allParticipants,
    admins: [req.user._id],
    createdBy: req.user._id,
  });

  await conversation.populate('participants', PARTICIPANT_SELECT);

  // Notify all added participants
  for (const participantId of participantIds) {
    await createAndEmit({
      io: req.io,
      recipientId: participantId,
      actorId: req.user._id,
      type: 'message',
      targetModel: null,
      targetId: conversation._id,
      message: `${req.user.fullName} added you to "${name.trim()}"`,
    });
  }

  sendSuccess(res, {
    statusCode: 201,
    data: { conversation: formatConversation(conversation, req.user._id) },
  });
});

// ────────────────────────────────────────────────────────────
//  GET /api/messages/conversations/:id  — Get single conversation
// ────────────────────────────────────────────────────────────
exports.getConversation = catchAsync(async (req, res, next) => {
  const conversation = await Conversation.findOne({
    _id: req.params.id,
    participants: req.user._id,
  })
    .populate('participants', PARTICIPANT_SELECT)
    .populate({
      path: 'lastMessage',
      select: 'content mediaType sender createdAt',
    });

  if (!conversation) return next(new AppError('Conversation not found.', 404));

  // Reset unread count for this user
  await Conversation.findByIdAndUpdate(req.params.id, {
    [`unreadCounts.${req.user._id}`]: 0,
  });

  sendSuccess(res, {
    data: { conversation: formatConversation(conversation, req.user._id) },
  });
});

// ────────────────────────────────────────────────────────────
//  GET /api/messages/conversations/:id/messages  — Get messages
// ────────────────────────────────────────────────────────────
exports.getMessages = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 40 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Verify user is in this conversation
  const conversation = await Conversation.findOne({
    _id: req.params.id,
    participants: req.user._id,
  });
  if (!conversation) return next(new AppError('Conversation not found.', 404));

  const [messages, total] = await Promise.all([
    Message.find({
      conversation: req.params.id,
      isDeleted: false,
      deletedFor: { $ne: req.user._id },
    })
      .populate('sender', SENDER_SELECT)
      .populate({
        path: 'replyTo',
        select: 'content sender mediaType',
        populate: { path: 'sender', select: 'fullName username' },
      })
      .sort({ createdAt: -1 }) // newest first for pagination, reversed on frontend
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Message.countDocuments({
      conversation: req.params.id,
      isDeleted: false,
      deletedFor: { $ne: req.user._id },
    }),
  ]);

  // Mark all as read for this user
  await Message.updateMany(
    { conversation: req.params.id, readBy: { $ne: req.user._id } },
    { $addToSet: { readBy: req.user._id } }
  );

  // Reset unread count
  await Conversation.findByIdAndUpdate(req.params.id, {
    [`unreadCounts.${req.user._id}`]: 0,
  });

  sendSuccess(res, {
    data: { messages: messages.reverse() }, // oldest first for display
    meta: { total, page: parseInt(page), hasMore: skip + messages.length < total },
  });
});

// ────────────────────────────────────────────────────────────
//  POST /api/messages/conversations/:id/messages  — Send message
// ────────────────────────────────────────────────────────────
exports.sendMessage = catchAsync(async (req, res, next) => {
  const { content, mediaUrl, mediaType, replyTo } = req.body;

  if (!content?.trim() && !mediaUrl) {
    return next(new AppError('Message must have content or media.', 400));
  }

  const conversation = await Conversation.findOne({
    _id: req.params.id,
    participants: req.user._id,
  });
  if (!conversation) return next(new AppError('Conversation not found.', 404));

  const message = await Message.create({
    conversation: req.params.id,
    sender: req.user._id,
    content: content?.trim() || '',
    mediaUrl: mediaUrl || null,
    mediaType: mediaType || null,
    replyTo: replyTo || null,
    readBy: [req.user._id], // sender has read it
  });

  await message.populate('sender', SENDER_SELECT);
  if (replyTo) {
    await message.populate({
      path: 'replyTo',
      select: 'content sender mediaType',
      populate: { path: 'sender', select: 'fullName username' },
    });
  }

  // Update conversation's last message + increment unread for others
  const otherParticipants = conversation.participants
    .filter(p => p.toString() !== req.user._id.toString());

  const unreadUpdate = {};
  otherParticipants.forEach(p => {
    unreadUpdate[`unreadCounts.${p}`] =
      (conversation.unreadCounts?.get(p.toString()) || 0) + 1;
  });

  await Conversation.findByIdAndUpdate(req.params.id, {
    lastMessage: message._id,
    lastMessageAt: new Date(),
    ...unreadUpdate,
  });

  // Emit message to all participants in the conversation room
  if (req.io) {
    req.io.to(`conversation:${req.params.id}`).emit('message:new', {
      message,
      conversationId: req.params.id,
    });

    // Also notify offline participants via their personal room
    for (const participantId of otherParticipants) {
      req.io.to(`user:${participantId}`).emit('message:notification', {
        conversationId: req.params.id,
        sender: {
          _id: req.user._id,
          fullName: req.user.fullName,
          username: req.user.username,
          avatarUrl: req.user.avatarUrl,
        },
        preview: content?.trim().slice(0, 60) || '📎 Attachment',
      });
    }
  }

  sendSuccess(res, {
    statusCode: 201,
    data: { message },
  });
});

// ────────────────────────────────────────────────────────────
//  DELETE /api/messages/conversations/:id/messages/:msgId
// ────────────────────────────────────────────────────────────
exports.deleteMessage = catchAsync(async (req, res, next) => {
  const message = await Message.findOne({
    _id: req.params.msgId,
    conversation: req.params.id,
  });
  if (!message) return next(new AppError('Message not found.', 404));

  const isSender = message.sender.toString() === req.user._id.toString();

  if (isSender) {
    // Delete for everyone
    message.isDeleted = true;
    message.content = '';
    await message.save();

    if (req.io) {
      req.io.to(`conversation:${req.params.id}`).emit('message:deleted', {
        messageId: message._id,
        conversationId: req.params.id,
      });
    }
  } else {
    // Delete only for this user
    message.deletedFor.push(req.user._id);
    await message.save();
  }

  sendSuccess(res, { message: 'Message deleted.' });
});

// ────────────────────────────────────────────────────────────
//  PATCH /api/messages/conversations/:id/read  — Mark as read
// ────────────────────────────────────────────────────────────
exports.markAsRead = catchAsync(async (req, res, next) => {
  await Message.updateMany(
    { conversation: req.params.id, readBy: { $ne: req.user._id } },
    { $addToSet: { readBy: req.user._id } }
  );

  await Conversation.findByIdAndUpdate(req.params.id, {
    [`unreadCounts.${req.user._id}`]: 0,
  });

  // Emit read receipt to other participants
  if (req.io) {
    req.io.to(`conversation:${req.params.id}`).emit('message:read', {
      conversationId: req.params.id,
      userId: req.user._id,
    });
  }

  sendSuccess(res, { message: 'Marked as read.' });
});

// ────────────────────────────────────────────────────────────
//  GET /api/messages/search?q=  — Search conversations
// ────────────────────────────────────────────────────────────
exports.searchConversations = catchAsync(async (req, res, next) => {
  const { q } = req.query;
  if (!q?.trim()) return next(new AppError('Search query required.', 400));

  const regex = new RegExp(q.trim(), 'i');

  // Search by participant name or group name
  const conversations = await Conversation.find({
    participants: req.user._id,
    $or: [
      { name: regex },
      { type: 'direct' },
    ],
  })
    .populate('participants', PARTICIPANT_SELECT)
    .populate('lastMessage', 'content mediaType createdAt')
    .lean();

  // For direct convs, filter by participant name
  const filtered = conversations.filter(c => {
    if (c.type !== 'direct') return regex.test(c.name);
    const other = c.participants.find(p => p._id?.toString() !== req.user._id.toString());
    return regex.test(other?.fullName) || regex.test(other?.username);
  });

  sendSuccess(res, {
    data: { conversations: filtered.map(c => formatConversation(c, req.user._id)) },
  });
});
