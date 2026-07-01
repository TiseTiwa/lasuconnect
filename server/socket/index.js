const logger = require('../utils/logger');
const LiveStream = require('../models/LiveStream');

const initSocket = (io) => {
  const onlineUsers   = new Map(); // userId → socketId
  const streamViewers = new Map(); // streamId → Set of socketIds
  const initSegments  = new Map(); // streamId → Buffer[] (first ~500ms of chunks for complete WebM init)
  const initDuration  = 500;       // ms — collect chunks for this long as the init segment

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
      socket.data.streamId  = streamId;
      socket.data.isHost    = true;
      socket.data.userId    = userId;
      socket.data.streamStart = Date.now();

      if (!streamViewers.has(streamId)) streamViewers.set(streamId, new Set());

      // Emit current viewer count to host immediately
      io.to(`stream:${streamId}`).emit('stream:viewer_count', {
        viewerCount: streamViewers.get(streamId).size,
      });

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

      const viewerCount = streamViewers.get(streamId).size;

      // Send all cached init chunks so late joiners can decode
      const cached = initSegments.get(streamId);
      if (cached && cached.length > 0) {
        cached.forEach(chunk => {
          socket.emit('stream:init', { streamId, chunk });
        });
      }

      // Update viewer count for everyone
      io.to(`stream:${streamId}`).emit('stream:viewer_count', { viewerCount });
    });

    // Viewer leaves a stream room
    socket.on('stream:leave', ({ streamId }) => {
      socket.leave(`stream:${streamId}`);
      if (streamViewers.has(streamId)) {
        streamViewers.get(streamId).delete(socket.id);
        io.to(`stream:${streamId}`).emit('stream:viewer_count', {
          viewerCount: streamViewers.get(streamId).size,
        });
      }
    });

    // ── VIDEO CHUNK RELAY ─────────────────────────────────
    socket.on('stream:chunk', ({ streamId, chunk }) => {
      // Accumulate init segment chunks for the first 500ms
      // This captures the full WebM EBML header + Tracks element
      if (!initSegments.has(streamId)) {
        initSegments.set(streamId, []);
        socket.data.streamStart = Date.now();
      }
      const elapsed = Date.now() - (socket.data.streamStart || Date.now());
      if (elapsed < initDuration) {
        initSegments.get(streamId).push(chunk);
      }

      socket.to(`stream:${streamId}`).emit('stream:chunk', { streamId, chunk });
    });

    // ── LIVE CHAT ─────────────────────────────────────────
    socket.on('stream:chat', ({ streamId, userId, fullName, avatarUrl, message }) => {
      if (!message?.trim()) return;
      io.to(`stream:${streamId}`).emit('stream:chat', {
        userId, fullName, avatarUrl,
        message: message.trim().slice(0, 200),
        timestamp: new Date(),
      });
    });

    // ── HOST ENDS STREAM ──────────────────────────────────
    socket.on('stream:end', ({ streamId }) => {
      io.to(`stream:${streamId}`).emit('stream:ended', { streamId });
      streamViewers.delete(streamId);
      initSegments.delete(streamId);
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
      const { streamId, isHost, userId } = socket.data || {};

      if (streamId) {
        if (isHost) {
          // S-6 fix: Host disconnected — end stream for all viewers
          io.to(`stream:${streamId}`).emit('stream:ended', { streamId });
          streamViewers.delete(streamId);
          initSegments.delete(streamId);
          // Mark stream ended in DB
          LiveStream.findOneAndUpdate(
            { _id: streamId, status: 'live' },
            { status: 'ended', endedAt: new Date() }
          ).catch(err => logger.error(`Failed to end stream on host disconnect: ${err.message}`));
          logger.info(`🔴 Stream ${streamId} ended — host disconnected`);
        } else if (streamViewers.has(streamId)) {
          streamViewers.get(streamId).delete(socket.id);
          io.to(`stream:${streamId}`).emit('stream:viewer_count', {
            viewerCount: streamViewers.get(streamId).size,
          });
        }
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
