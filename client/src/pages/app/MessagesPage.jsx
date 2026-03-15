import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useAuthStore from '../../context/useAuthStore';
import { useSocket } from '../../context/SocketContext';
import useIsMobile from '../../hooks/useIsMobile';
import {
  getConversations, getOrCreateDM, getMessages,
  sendMessage, markAsRead, deleteMessage,   // ← Bug 1 fix: deleteMessage now in top import
  uploadMessageMedia,
} from '../../services/messagesService';
import { searchUsers } from '../../services/usersService';

// ── Helpers ────────────────────────────────────────────────
const timeAgo = (date) => {
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
};

const formatTime = (date) =>
  new Date(date).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', hour12: true });

const formatDate = (date) => {
  const d = new Date(date);
  const now = new Date();
  const diff = Math.floor((now - d) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'short' });
};

const isSameDay = (a, b) => {
  const da = new Date(a), db = new Date(b);
  return da.getDate() === db.getDate() &&
    da.getMonth() === db.getMonth() &&
    da.getFullYear() === db.getFullYear();
};

// ── Avatar ─────────────────────────────────────────────────
const Avatar = ({ user, size = 40, online = false }) => {
  const initials = user?.fullName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  const colors = ['#1D4ED8','#7C3AED','#DB2777','#059669','#D97706','#DC2626'];
  const color = colors[(user?.username?.charCodeAt(0) || 0) % colors.length];
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <div style={{ width: size, height: size, borderRadius: '50%', background: user?.avatarUrl ? 'transparent' : color, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {user?.avatarUrl
          ? <img src={user.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ color: 'white', fontWeight: 700, fontSize: size * 0.35, fontFamily: 'Geist, sans-serif' }}>{initials}</span>
        }
      </div>
      {online && <div style={{ position: 'absolute', bottom: 1, right: 1, width: size * 0.25, height: size * 0.25, borderRadius: '50%', background: '#22C55E', border: '2px solid white' }} />}
    </div>
  );
};

// ── New Chat Modal ─────────────────────────────────────────
const NewChatModal = ({ onClose, onStart }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchUsers(query.trim());
        setResults(res.data.data.users);
      } catch (_) {}
      setLoading(false);
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  return (
    <div style={s.modalOverlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        <div style={s.modalHeader}>
          <h3 style={s.modalTitle}>New Message</h3>
          <button onClick={onClose} style={s.closeBtn}>✕</button>
        </div>
        <div style={{ padding: '12px 16px' }}>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16 }}>🔍</span>
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search students..."
              style={{ ...s.searchInput, paddingLeft: 38 }}
            />
          </div>
        </div>
        <div style={{ maxHeight: 320, overflowY: 'auto' }}>
          {loading && <div style={{ padding: '20px', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>Searching...</div>}
          {!loading && results.map(user => (
            <div key={user._id} onClick={() => onStart(user)} style={s.userRow}
              onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
              onMouseLeave={e => e.currentTarget.style.background = 'white'}>
              <Avatar user={user} size={42} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={s.userName}>{user.fullName}</div>
                <div style={s.userMeta}>@{user.username} · {user.department}</div>
              </div>
            </div>
          ))}
          {!loading && query && results.length === 0 && (
            <div style={{ padding: '24px', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>No students found</div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Conversation List Item ─────────────────────────────────
const ConvItem = ({ conv, isActive, onClick }) => {
  const hasUnread = conv.unreadCount > 0;
  const lastMsg = conv.lastMessage;
  const preview = lastMsg?.isDeleted
    ? '🚫 Message deleted'
    : lastMsg?.mediaType
    ? `📎 ${lastMsg.mediaType}`
    : lastMsg?.content?.slice(0, 40) || 'No messages yet';

  return (
    <div onClick={onClick}
      style={{ ...s.convItem, background: isActive ? '#EFF6FF' : 'white', borderLeft: isActive ? '3px solid #2563EB' : '3px solid transparent' }}
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#F8FAFC'; }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'white'; }}
    >
      <div style={{ position: 'relative' }}>
        <Avatar user={{ fullName: conv.displayName, avatarUrl: conv.displayAvatar, username: conv.otherUser?.username }} size={48} />
        {conv.type !== 'direct' && (
          <div style={{ position: 'absolute', bottom: -2, right: -2, width: 18, height: 18, borderRadius: '50%', background: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, border: '2px solid white' }}>👥</div>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
          <span style={{ fontFamily: 'Geist, sans-serif', fontWeight: hasUnread ? 700 : 600, fontSize: 14, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>
            {conv.displayName}
          </span>
          <span style={{ fontSize: 11, color: '#94A3B8', flexShrink: 0 }}>
            {lastMsg ? timeAgo(lastMsg.createdAt) : ''}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: hasUnread ? '#1E293B' : '#94A3B8', fontWeight: hasUnread ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>
            {preview}
          </span>
          {hasUnread && (
            <span style={{ background: '#2563EB', color: 'white', borderRadius: 20, padding: '1px 7px', fontSize: 11, fontWeight: 700, flexShrink: 0, fontFamily: 'Geist, sans-serif' }}>
              {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Message Bubble ─────────────────────────────────────────
const MessageBubble = ({ msg, isMe, showAvatar, onDelete, onReply }) => {
  const [showActions, setShowActions] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 8, marginBottom: 2 }}>
      {!isMe && (
        <div style={{ width: 28, flexShrink: 0 }}>
          {showAvatar && <Avatar user={msg.sender} size={28} />}
        </div>
      )}

      <div style={{ maxWidth: '72%', position: 'relative' }}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        {/* Reply preview */}
        {msg.replyTo && !msg.replyTo.isDeleted && (
          <div style={{ ...s.replyPreview, background: isMe ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.06)' }}>
            <div style={s.replyBar} />
            <div style={{ minWidth: 0 }}>
              <div style={{ ...s.replyName, color: isMe ? 'rgba(255,255,255,0.8)' : '#2563EB' }}>
                {msg.replyTo.sender?.fullName}
              </div>
              <div style={{ ...s.replyText, color: isMe ? 'rgba(255,255,255,0.65)' : '#64748B' }}>
                {msg.replyTo.content?.slice(0, 60)}
              </div>
            </div>
          </div>
        )}

        {/* Bubble */}
        <div style={{
          ...s.bubble,
          background: isMe ? 'linear-gradient(135deg, #1D4ED8, #2563EB)' : 'white',
          color: isMe ? 'white' : '#1E293B',
          borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          boxShadow: isMe ? '0 2px 8px rgba(37,99,235,0.3)' : '0 1px 4px rgba(0,0,0,0.08)',
          border: isMe ? 'none' : '1px solid #F1F5F9',
        }}>
          {/* Sender name in groups */}
          {!isMe && showAvatar && (
            <div style={{ fontSize: 11, fontWeight: 700, color: '#2563EB', marginBottom: 3, fontFamily: 'Geist, sans-serif' }}>
              {msg.sender?.fullName}
            </div>
          )}

          {/* Media */}
          {msg.mediaUrl && (
            <div style={{ marginBottom: msg.content ? 8 : 0 }}>
              {msg.mediaType === 'image' && (
                <img src={msg.mediaUrl} alt="" style={{ maxWidth: '100%', maxHeight: 240, borderRadius: 10, display: 'block' }} />
              )}
              {msg.mediaType === 'pdf' && (
                <a href={msg.mediaUrl} target="_blank" rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 8, color: isMe ? 'white' : '#2563EB', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                  📄 View Document
                </a>
              )}
            </div>
          )}

          {/* Deleted message */}
          {msg.isDeleted ? (
            <span style={{ fontStyle: 'italic', opacity: 0.6, fontSize: 13 }}>🚫 Message deleted</span>
          ) : (
            msg.content && <span style={{ fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.content}</span>
          )}

          {/* Timestamp + read receipts */}
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', justifyContent: 'flex-end', marginTop: 4 }}>
            <span style={{ fontSize: 10, opacity: 0.65 }}>{formatTime(msg.createdAt)}</span>
            {isMe && !msg.isDeleted && (
              <span style={{ fontSize: 11, opacity: 0.8 }}>
                {msg.readBy?.length > 1 ? '✓✓' : '✓'}
              </span>
            )}
          </div>
        </div>

        {/* Hover actions — Bug 3 fix: reply button now calls onReply */}
        {showActions && !msg.isDeleted && (
          <div style={{
            position: 'absolute', top: -32, [isMe ? 'left' : 'right']: 0,
            display: 'flex', gap: 4, background: 'white', borderRadius: 20,
            padding: '4px 10px', boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
            zIndex: 10, border: '1px solid #F1F5F9',
          }}>
            <button onClick={() => onReply(msg)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '2px', title: 'Reply' }}>
              ↩️
            </button>
            {isMe && (
              <button onClick={() => onDelete(msg._id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '2px' }}>
                🗑️
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Chat Window ────────────────────────────────────────────
const ChatWindow = ({ conversation, currentUser, socket, onConversationUpdate }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [hasMore, setHasMore] = useState(false); // ← Bug 4 fix: start false
  const [page, setPage] = useState(1);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const convId = conversation._id;

  const loadMessages = useCallback(async (pageNum = 1, reset = false) => {
    try {
      const res = await getMessages(convId, pageNum);
      const { messages: newMsgs } = res.data.data;
      const { meta } = res.data;
      setMessages(p => reset ? newMsgs : [...newMsgs, ...p]);
      setHasMore(meta.hasMore);
      setPage(pageNum);
    } catch (_) {}
    setLoading(false);
  }, [convId]);

  useEffect(() => {
    setLoading(true);
    setMessages([]);
    setPage(1);
    setHasMore(false);
    loadMessages(1, true);
    markAsRead(convId).catch(() => {});
    if (socket) socket.emit('conversation:join', convId);

    // Bug 7 fix: cleanup typing timeout on unmount
    return () => {
      if (socket) socket.emit('conversation:leave', convId);
      clearTimeout(typingTimeoutRef.current);
    };
  }, [convId]);

  // Scroll to bottom when messages first load or new message arrives
  useEffect(() => {
    if (page === 1) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }, [messages.length, page]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    const onNewMessage = ({ message, conversationId }) => {
      if (conversationId !== convId) return;
      setMessages(p => [...p, message]);
      markAsRead(convId).catch(() => {});
      // Bug 6 fix: notify parent to refresh inbox order
      onConversationUpdate?.();
    };

    const onTypingStart = ({ userId, fullName, conversationId }) => {
      if (conversationId !== convId || userId === currentUser._id) return;
      setTyping({ userId, fullName });
    };

    const onTypingStop = ({ conversationId }) => {
      if (conversationId !== convId) return;
      setTyping(null);
    };

    const onMessageDeleted = ({ messageId }) => {
      setMessages(p => p.map(m => m._id === messageId ? { ...m, isDeleted: true, content: '' } : m));
    };

    const onMessageRead = ({ userId, conversationId }) => {
      if (conversationId !== convId || userId === currentUser._id) return;
      setMessages(p => p.map(m => ({
        ...m,
        readBy: m.readBy?.some(id => id.toString() === userId.toString())
          ? m.readBy
          : [...(m.readBy || []), userId],
      })));
    };

    socket.on('message:new', onNewMessage);
    socket.on('typing:start', onTypingStart);
    socket.on('typing:stop', onTypingStop);
    socket.on('message:deleted', onMessageDeleted);
    socket.on('message:read', onMessageRead);

    return () => {
      socket.off('message:new', onNewMessage);
      socket.off('typing:start', onTypingStart);
      socket.off('typing:stop', onTypingStop);
      socket.off('message:deleted', onMessageDeleted);
      socket.off('message:read', onMessageRead);
    };
  }, [socket, convId, currentUser._id]);

  const handleTyping = (e) => {
    setText(e.target.value);
    if (!socket) return;
    socket.emit('typing:start', { conversationId: convId, userId: currentUser._id, fullName: currentUser.fullName });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing:stop', { conversationId: convId, userId: currentUser._id });
    }, 1500);
  };

  const handleSend = async () => {
    // Bug 2 fix: don't allow sending with empty content even if replyTo is set
    if (!text.trim() || sending) return;
    setSending(true);
    socket?.emit('typing:stop', { conversationId: convId, userId: currentUser._id });
    try {
      await sendMessage(convId, {
        content: text.trim(),
        replyTo: replyTo?._id || null,
      });
      setText('');
      setReplyTo(null);
      onConversationUpdate?.(); // Bug 6 fix: update inbox after sending
    } catch (_) {}
    setSending(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingMedia(true);
    try {
      const res = await uploadMessageMedia(file);
      const { mediaUrls, mediaType } = res.data.data;
      await sendMessage(convId, { content: '', mediaUrl: mediaUrls[0], mediaType });
      onConversationUpdate?.();
    } catch (_) {}
    setUploadingMedia(false);
    e.target.value = '';
  };

  // Bug 1 fix: use top-level import instead of dynamic import
  const handleDelete = async (msgId) => {
    try {
      await deleteMessage(convId, msgId);
      setMessages(p => p.map(m => m._id === msgId ? { ...m, isDeleted: true, content: '' } : m));
    } catch (_) {}
  };

  const renderMessages = () => {
    const elements = [];
    messages.forEach((msg, i) => {
      const prev = messages[i - 1];
      if (!prev || !isSameDay(prev.createdAt, msg.createdAt)) {
        elements.push(
          <div key={`date-${msg._id}`} style={s.dateSeparator}>
            <span style={s.dateSeparatorText}>{formatDate(msg.createdAt)}</span>
          </div>
        );
      }

      // Bug 5 fix: robust isMe check
      const senderId = msg.sender?._id?.toString() || msg.sender?.toString() || '';
      const myId = currentUser?._id?.toString() || '';
      const isMe = senderId === myId && myId !== '';

      const nextMsg = messages[i + 1];
      const nextSenderId = nextMsg?.sender?._id?.toString() || nextMsg?.sender?.toString() || '';
      const showAvatar = !isMe && (nextSenderId !== senderId || !isSameDay(msg.createdAt, nextMsg?.createdAt));

      elements.push(
        <MessageBubble
          key={msg._id}
          msg={msg}
          isMe={isMe}
          showAvatar={showAvatar}
          onDelete={handleDelete}
          onReply={setReplyTo} // Bug 3 fix: wire up reply
        />
      );
    });
    return elements;
  };

  return (
    <div style={s.chatWindow}>
      {/* Chat header */}
      <div style={s.chatHeader}>
        <Avatar
          user={{ fullName: conversation.displayName, avatarUrl: conversation.displayAvatar, username: conversation.otherUser?.username }}
          size={40}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={s.chatName}>{conversation.displayName}</div>
          <div style={s.chatMeta}>
            {conversation.type === 'direct'
              ? `@${conversation.otherUser?.username}`
              : `${conversation.participants?.length} members`
            }
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div style={s.messagesArea}>
        {hasMore && !loading && (
          <button onClick={() => loadMessages(page + 1)} style={s.loadMoreBtn}>
            Load older messages
          </button>
        )}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <div style={s.spinner} />
          </div>
        ) : messages.length === 0 ? (
          <div style={s.emptyChat}>
            <Avatar user={{ fullName: conversation.displayName, avatarUrl: conversation.displayAvatar }} size={64} />
            <h3 style={s.emptyChatTitle}>{conversation.displayName}</h3>
            <p style={s.emptyChatText}>
              {conversation.type === 'direct'
                ? `This is the beginning of your conversation with ${conversation.displayName}.`
                : `Welcome to ${conversation.displayName}!`
              }
            </p>
          </div>
        ) : (
          <div style={{ padding: '16px 16px 8px' }}>
            {renderMessages()}
          </div>
        )}

        {/* Typing indicator */}
        {typing && (
          <div style={{ padding: '4px 16px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={s.typingDots}>
              <div style={s.dot} />
              <div style={{ ...s.dot, animationDelay: '0.15s' }} />
              <div style={{ ...s.dot, animationDelay: '0.3s' }} />
            </div>
            <span style={{ fontSize: 12, color: '#94A3B8' }}>{typing.fullName} is typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Reply preview */}
      {replyTo && (
        <div style={s.replyBar2}>
          <div style={s.replyBarLine} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#2563EB', marginBottom: 2 }}>
              Replying to {replyTo.sender?.fullName}
            </div>
            <div style={{ fontSize: 12, color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {replyTo.content || '📎 Attachment'}
            </div>
          </div>
          <button onClick={() => setReplyTo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#94A3B8', padding: '4px' }}>✕</button>
        </div>
      )}

      {/* Input area */}
      <div style={s.inputArea}>
        <input ref={fileInputRef} type="file" accept="image/*,application/pdf" onChange={handleFileSelect} style={{ display: 'none' }} />
        <button onClick={() => fileInputRef.current?.click()} disabled={uploadingMedia} style={s.attachBtn}>
          {uploadingMedia ? '⏳' : '📎'}
        </button>
        <textarea
          ref={inputRef}
          value={text}
          onChange={handleTyping}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
          style={s.messageInput}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          style={{ ...s.sendBtn, opacity: text.trim() && !sending ? 1 : 0.5 }}
        >
          {sending ? '⏳' : '➤'}
        </button>
      </div>
    </div>
  );
};

// ── Main Messages Page ─────────────────────────────────────
const MessagesPage = () => {
  const isMobile = useIsMobile();
  const { id: convIdParam } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const socket = useSocket();

  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadConversations = useCallback(async () => {
    try {
      const res = await getConversations();
      setConversations(res.data.data.conversations);
    } catch (_) {}
    setLoading(false);
  }, []);

  useEffect(() => { loadConversations(); }, []);

  // Open conversation from URL param
  useEffect(() => {
    if (convIdParam && conversations.length > 0) {
      const found = conversations.find(c => c._id === convIdParam);
      if (found) setActiveConv(found);
    }
  }, [convIdParam, conversations]);

  // Socket: incoming message notification → refresh inbox
  useEffect(() => {
    if (!socket) return;
    const handler = ({ conversationId, sender, preview }) => {
      setConversations(p => {
        const updated = p.map(c => {
          if (c._id !== conversationId) return c;
          return {
            ...c,
            lastMessage: { content: preview, createdAt: new Date(), sender },
            lastMessageAt: new Date(),
            unreadCount: activeConv?._id === conversationId ? 0 : (c.unreadCount || 0) + 1,
          };
        });
        // Sort by lastMessageAt so latest conversation rises to top
        return updated.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
      });
    };
    socket.on('message:notification', handler);
    return () => socket.off('message:notification', handler);
  }, [socket, activeConv]);

  const handleStartDM = async (targetUser) => {
    setShowNewChat(false);
    try {
      const res = await getOrCreateDM(targetUser._id);
      const conv = res.data.data.conversation;
      setConversations(p => {
        const exists = p.find(c => c._id === conv._id);
        return exists ? p : [conv, ...p];
      });
      setActiveConv(conv);
      navigate(`/messages/${conv._id}`);
    } catch (_) {}
  };

  const handleSelectConv = (conv) => {
    setActiveConv(conv);
    navigate(`/messages/${conv._id}`);
    setConversations(p => p.map(c => c._id === conv._id ? { ...c, unreadCount: 0 } : c));
  };

  // Bug 6 fix: refresh inbox when a message is sent
  const handleConversationUpdate = useCallback(() => {
    loadConversations();
  }, [loadConversations]);

  // Bug 8 fix: client-side filter only — removed unused searchConversations import
  const filtered = searchQuery
    ? conversations.filter(c =>
        c.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.otherUser?.username?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : conversations;

  return (
    <div style={s.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        textarea { resize: none; }
        textarea:focus, input:focus { outline: none; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes bounce { 0%,80%,100%{transform:scale(0)} 40%{transform:scale(1)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div style={s.layout}>
        {/* ── Sidebar ── */}
        <div style={{ ...s.sidebar, display: isMobile ? (activeConv ? 'none' : 'flex') : 'flex', width: isMobile ? '100%' : 320 }}>
          <div style={s.sidebarHeader}>
            <h2 style={s.sidebarTitle}>Messages</h2>
            <button onClick={() => setShowNewChat(true)} style={s.newChatBtn}>✏️</button>
          </div>

          <div style={{ padding: '0 12px 12px', position: 'relative' }}>
            <span style={{ position: 'absolute', left: 24, top: '50%', transform: 'translateY(-50%)', fontSize: 15 }}>🔍</span>
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              style={{ ...s.searchInput, paddingLeft: 38 }}
            />
          </div>

          <div style={s.convList}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                <div style={s.spinner} />
              </div>
            ) : filtered.length === 0 ? (
              <div style={s.emptyInbox}>
                <span style={{ fontSize: 40 }}>💬</span>
                <p style={{ color: '#64748B', fontSize: 14, marginTop: 12, textAlign: 'center' }}>
                  {searchQuery ? 'No conversations found' : 'No messages yet.\nTap ✏️ to start a conversation!'}
                </p>
              </div>
            ) : (
              filtered.map(conv => (
                <ConvItem
                  key={conv._id}
                  conv={conv}
                  isActive={activeConv?._id === conv._id}
                  onClick={() => handleSelectConv(conv)}
                />
              ))
            )}
          </div>
        </div>

        {/* ── Chat area ── */}
        <div style={{ ...s.chatArea, display: isMobile ? (activeConv ? 'flex' : 'none') : 'flex' }}>
          {activeConv ? (
            <>
              <button onClick={() => { setActiveConv(null); navigate('/messages'); }} style={s.backBtn}>
                ← Back
              </button>
              <ChatWindow
                key={activeConv._id}
                conversation={activeConv}
                currentUser={user}
                socket={socket}
                onConversationUpdate={handleConversationUpdate}
              />
            </>
          ) : (
            <div style={s.noChatSelected}>
              <span style={{ fontSize: 56 }}>💬</span>
              <h3 style={s.noChatTitle}>Your Messages</h3>
              <p style={s.noChatText}>Select a conversation or tap ✏️ to message someone new.</p>
              <button onClick={() => setShowNewChat(true)} style={s.startChatBtn}>
                Start a Conversation
              </button>
            </div>
          )}
        </div>
      </div>

      {showNewChat && <NewChatModal onClose={() => setShowNewChat(false)} onStart={handleStartDM} />}
    </div>
  );
};

// ─── Styles ───────────────────────────────────────────────
const s = {
  page: { height: 'calc(100vh - 80px)', fontFamily: "'DM Sans', sans-serif", overflow: 'hidden' },
  layout: { display: 'flex', height: '100%', background: 'white', borderRadius: 20, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' },

  sidebar: { width: 320, borderRight: '1px solid #F1F5F9', flexDirection: 'column', flexShrink: 0 },
  sidebarHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 16px 8px' },
  sidebarTitle: { fontFamily: 'Geist, sans-serif', fontWeight: 800, fontSize: 20, color: '#0F172A', margin: 0 },
  newChatBtn: { width: 36, height: 36, borderRadius: '50%', border: 'none', background: '#EFF6FF', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB' },
  searchInput: { width: '100%', padding: '9px 12px', border: '1.5px solid #E2E8F0', borderRadius: 12, fontSize: 13, color: '#0F172A', background: '#F8FAFC', fontFamily: "'DM Sans', sans-serif" },
  convList: { flex: 1, overflowY: 'auto' },
  convItem: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer', transition: 'background 0.15s', borderBottom: '1px solid #F8FAFC' },

  chatArea: { flex: 1, flexDirection: 'column', minWidth: 0 },
  chatWindow: { display: 'flex', flexDirection: 'column', height: '100%' },
  chatHeader: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: '1px solid #F1F5F9', background: 'white', flexShrink: 0 },
  chatName: { fontFamily: 'Geist, sans-serif', fontWeight: 700, fontSize: 15, color: '#0F172A' },
  chatMeta: { fontSize: 12, color: '#94A3B8' },

  messagesArea: { flex: 1, overflowY: 'auto', background: '#F8FAFC' },
  loadMoreBtn: { display: 'block', margin: '12px auto', padding: '6px 16px', border: '1.5px solid #E2E8F0', borderRadius: 20, background: 'white', fontSize: 12, fontWeight: 600, color: '#64748B', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" },

  emptyChat: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 40, textAlign: 'center' },
  emptyChatTitle: { fontFamily: 'Geist, sans-serif', fontWeight: 700, fontSize: 18, color: '#0F172A', margin: '16px 0 8px' },
  emptyChatText: { fontSize: 13.5, color: '#64748B', lineHeight: 1.6, maxWidth: 280 },

  dateSeparator: { display: 'flex', alignItems: 'center', padding: '12px 0', margin: '4px 0' },
  dateSeparatorText: { fontSize: 12, color: '#94A3B8', fontWeight: 600, background: '#F8FAFC', padding: '3px 12px', borderRadius: 20, margin: '0 auto', border: '1px solid #E2E8F0' },

  bubble: { padding: '8px 12px', maxWidth: '100%', wordBreak: 'break-word' },

  replyPreview: { borderRadius: '10px 10px 0 0', padding: '6px 10px', display: 'flex', gap: 8, maxWidth: '100%', marginBottom: -4 },
  replyBar: { width: 3, borderRadius: 3, background: '#2563EB', flexShrink: 0 },
  replyName: { fontSize: 11, fontWeight: 700, marginBottom: 2 },
  replyText: { fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 },

  replyBar2: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', background: '#EFF6FF', borderTop: '1px solid #DBEAFE', flexShrink: 0 },
  replyBarLine: { width: 3, height: 36, borderRadius: 3, background: '#2563EB', flexShrink: 0 },

  inputArea: { display: 'flex', gap: 8, padding: '12px 16px', background: 'white', borderTop: '1px solid #F1F5F9', alignItems: 'flex-end', flexShrink: 0 },
  attachBtn: { width: 38, height: 38, borderRadius: '50%', border: 'none', background: '#F1F5F9', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  messageInput: { flex: 1, padding: '9px 14px', border: '1.5px solid #E2E8F0', borderRadius: 20, fontSize: 14, color: '#0F172A', background: '#F8FAFC', fontFamily: "'DM Sans', sans-serif", maxHeight: 120, overflowY: 'auto' },
  sendBtn: { width: 38, height: 38, borderRadius: '50%', border: 'none', background: 'linear-gradient(135deg, #1D4ED8, #3B82F6)', color: 'white', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'opacity 0.15s' },

  typingDots: { display: 'flex', gap: 3, padding: '6px 10px', background: 'white', borderRadius: 20, border: '1px solid #F1F5F9' },
  dot: { width: 6, height: 6, borderRadius: '50%', background: '#94A3B8', animation: 'bounce 1.2s ease infinite' },

  noChatSelected: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, textAlign: 'center', background: '#F8FAFC' },
  noChatTitle: { fontFamily: 'Geist, sans-serif', fontWeight: 700, fontSize: 22, color: '#0F172A', margin: '16px 0 8px' },
  noChatText: { fontSize: 14, color: '#64748B', lineHeight: 1.6, maxWidth: 300, marginBottom: 24 },
  startChatBtn: { padding: '10px 24px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #1D4ED8, #3B82F6)', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Geist, sans-serif', boxShadow: '0 3px 10px rgba(37,99,235,0.3)' },

  backBtn: { display: 'block', padding: '8px 16px', border: 'none', background: 'white', borderBottom: '1px solid #F1F5F9', color: '#2563EB', fontSize: 14, fontWeight: 600, cursor: 'pointer', textAlign: 'left', fontFamily: "'DM Sans', sans-serif", flexShrink: 0, width: '100%' },

  spinner: { width: 28, height: 28, border: '3px solid #E2E8F0', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 0.7s linear infinite' },

  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 },
  modal: { background: 'white', borderRadius: 20, width: '100%', maxWidth: 420, boxShadow: '0 24px 80px rgba(0,0,0,0.2)', overflow: 'hidden' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #F1F5F9' },
  modalTitle: { fontFamily: 'Geist, sans-serif', fontWeight: 700, fontSize: 17, color: '#0F172A', margin: 0 },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#94A3B8' },
  userRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', cursor: 'pointer', transition: 'background 0.15s', borderBottom: '1px solid #F8FAFC' },
  userName: { fontFamily: 'Geist, sans-serif', fontWeight: 700, fontSize: 14, color: '#0F172A' },
  userMeta: { fontSize: 12, color: '#94A3B8' },

  emptyInbox: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px' },
};

export default MessagesPage;
