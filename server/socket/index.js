const logger = require('../utils/logger');

const initSocket = (io) => {
  const onlineUsers   = new Map(); // userId → socketId
  const streamViewers = new Map(); // streamId → Set of socketIds

  io.on('connection', (socket) => {
    logger.info(`🔌 Socket connected: ${socket.id}`);

    // ── USER JOINS ────────────────────────────────────────
    socket.on('user:join', (userId) => {
      if (!userId) return;
      onlineUsers.set(userId, socket.id);
      socket.join(`user:${userId}`);
      socket.broadcast.emit('user:online', { userId });
    });

    // ── MESSAGING ─────────────────────────────────────────
    socket.on('conversation:join',  (id) => socket.join(`conversation:${id}`));
    socket.on('conversation:leave', (id) => socket.leave(`conversation:${id}`));

    socket.on('typing:start', ({ conversationId, userId, fullName }) => {
      socket.to(`conversation:${conversationId}`).emit('typing:start', { userId, fullName, conversationId });
    });
    socket.on('typing:stop', ({ conversationId, userId }) => {
      socket.to(`conversation:${conversationId}`).emit('typing:stop', { userId, conversationId });
    });
    socket.on('message:read', ({ conversationId, userId }) => {
      socket.to(`conversation:${conversationId}`).emit('message:read', { conversationId, userId });
    });

    // ── LIVE STREAMING ────────────────────────────────────

    // Host joins their own stream room
    socket.on('stream:host', ({ streamId, userId }) => {
      socket.join(`stream:${streamId}`);
      socket.data.streamId = streamId;
      socket.data.isHost   = true;
      socket.data.userId   = userId;

      if (!streamViewers.has(streamId)) streamViewers.set(streamId, new Set());
      logger.info(`🎥 Host ${userId} started stream ${streamId}`);
    });

    // Viewer joins a stream room
    socket.on('stream:join', ({ streamId, userId }) => {
      socket.join(`stream:${streamId}`);
      socket.data.streamId = streamId;
      socket.data.isHost   = false;
      socket.data.userId   = userId;

      if (!streamViewers.has(streamId)) streamViewers.set(streamId, new Set());
      streamViewers.get(streamId).add(socket.id);

      // Tell host a viewer joined
      socket.to(`stream:${streamId}`).emit('stream:viewer_joined', {
        userId,
        viewerCount: streamViewers.get(streamId).size,
      });
    });

    // Viewer leaves a stream room
    socket.on('stream:leave', ({ streamId, userId }) => {
      socket.leave(`stream:${streamId}`);
      if (streamViewers.has(streamId)) {
        streamViewers.get(streamId).delete(socket.id);
        io.to(`stream:${streamId}`).emit('stream:viewer_count', {
          viewerCount: streamViewers.get(streamId).size,
        });
      }
    });

    // ── VIDEO CHUNK RELAY ─────────────────────────────────
    // Host sends binary video chunk → server relays to all viewers in room
    socket.on('stream:chunk', ({ streamId, chunk }) => {
      // Only relay from the host — broadcast to everyone else in the room
      socket.to(`stream:${streamId}`).emit('stream:chunk', { streamId, chunk });
    });

    // ── LIVE CHAT ─────────────────────────────────────────
    socket.on('stream:chat', ({ streamId, userId, fullName, avatarUrl, message }) => {
      if (!message?.trim()) return;
      io.to(`stream:${streamId}`).emit('stream:chat', {
        userId,
        fullName,
        avatarUrl,
        message: message.trim().slice(0, 200),
        timestamp: new Date(),
      });
    });

    // ── HOST ENDS STREAM ──────────────────────────────────
    socket.on('stream:end', ({ streamId }) => {
      io.to(`stream:${streamId}`).emit('stream:ended', { streamId });
      streamViewers.delete(streamId);
      logger.info(`🔴 Stream ${streamId} ended`);
    });

    // ── ONLINE STATUS ─────────────────────────────────────
    socket.on('user:getOnlineStatus', (userIds) => {
      const statuses = {};
      userIds.forEach(id => { statuses[id] = onlineUsers.has(id); });
      socket.emit('user:onlineStatuses', statuses);
    });

    // ── DISCONNECT ────────────────────────────────────────
    socket.on('disconnect', () => {
      // Clean up viewer count if they were in a stream
      const { streamId, isHost, userId } = socket.data || {};
      if (streamId && !isHost && streamViewers.has(streamId)) {
        streamViewers.get(streamId).delete(socket.id);
        io.to(`stream:${streamId}`).emit('stream:viewer_count', {
          viewerCount: streamViewers.get(streamId).size,
        });
      }

      // Remove from online users
      let disconnectedId = null;
      for (const [uid, sid] of onlineUsers.entries()) {
        if (sid === socket.id) { disconnectedId = uid; onlineUsers.delete(uid); break; }
      }
      if (disconnectedId) {
        socket.broadcast.emit('user:offline', { userId: disconnectedId });
      }
    });
  });

  logger.info('✅ Socket.IO initialized with live streaming support.');
};

module.exports = { initSocket };
