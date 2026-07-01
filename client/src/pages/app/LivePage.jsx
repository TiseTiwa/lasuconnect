import { useState, useEffect, useRef } from 'react';
import useIsMobile from '../../hooks/useIsMobile';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../context/useAuthStore';
import { useSocket } from '../../context/SocketContext';
import {
  getStreams, createStream, startStream, endStream,
  joinStream, leaveStream, getLiveKitToken,
} from '../../services/liveService';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  ControlBar,
  GridLayout,
  ParticipantTile,
  useTracks,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import '@livekit/components-styles';

// ── Helpers ────────────────────────────────────────────────
const timeAgo = (date) => {
  if (!date) return '';
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
};

const formatDuration = (start) => {
  if (!start) return '00:00';
  const secs = Math.floor((Date.now() - new Date(start)) / 1000);
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const sc = (secs % 60).toString().padStart(2, '0');
  return `${m}:${sc}`;
};

const CATEGORIES = [
  { id: 'lecture',    label: '📖 Lecture',    color: '#2563EB' },
  { id: 'discussion', label: '💬 Discussion',  color: '#7C3AED' },
  { id: 'event',      label: '🎉 Event',       color: '#DB2777' },
  { id: 'tutorial',   label: '🎓 Tutorial',    color: '#059669' },
  { id: 'general',    label: '📡 General',     color: '#D97706' },
];

const getCategoryConfig = (id) => CATEGORIES.find(c => c.id === id) || CATEGORIES[4];

// ── Avatar ─────────────────────────────────────────────────
const Avatar = ({ user, size = 36 }) => {
  const initials = user?.fullName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  const colors   = ['#1D4ED8','#7C3AED','#DB2777','#059669','#D97706','#DC2626'];
  const color    = colors[(user?.username?.charCodeAt(0) || 0) % colors.length];
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: user?.avatarUrl ? 'transparent' : color, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
      {user?.avatarUrl
        ? <img src={user.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span style={{ color: 'white', fontWeight: 700, fontSize: size * 0.35, fontFamily: 'Geist, sans-serif' }}>{initials}</span>
      }
    </div>
  );
};

// ── Live Chat ──────────────────────────────────────────────
const LiveChat = ({ streamId, currentUser, socket, overlay = false }) => {
  const [messages, setMessages] = useState([]);
  const [text, setText]         = useState('');
  const bottomRef               = useRef(null);

  useEffect(() => {
    if (!socket) return;
    const handler = (msg) => setMessages(p => [...p.slice(-199), msg]);
    socket.on('stream:chat', handler);
    return () => socket.off('stream:chat', handler);
  }, [socket, streamId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!text.trim() || !socket) return;
    socket.emit('stream:chat', {
      streamId, userId: currentUser._id,
      fullName: currentUser.fullName, avatarUrl: currentUser.avatarUrl,
      message: text.trim(),
    });
    setText('');
  };

  if (overlay) {
    // TikTok-style: overlaid on video, transparent background, messages from bottom
    return (
      <div style={{ position: 'absolute', bottom: 60, left: 0, right: 0, pointerEvents: 'none', padding: '0 12px' }}>
        {/* Messages */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8, maxHeight: 200, overflowY: 'hidden', justifyContent: 'flex-end' }}>
          {messages.slice(-6).map((msg, i) => {
            const isMe = msg.userId === currentUser._id;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#2563EB', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: 'white', fontWeight: 700 }}>
                  {msg.avatarUrl ? <img src={msg.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : msg.fullName?.[0]?.toUpperCase()}
                </div>
                <div style={{ background: 'rgba(0,0,0,0.55)', borderRadius: 12, padding: '4px 10px', backdropFilter: 'blur(4px)' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: isMe ? '#60A5FA' : 'rgba(255,255,255,0.8)', marginRight: 5 }}>{isMe ? 'You' : msg.fullName}</span>
                  <span style={{ fontSize: 12, color: 'white' }}>{msg.message}</span>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
        {/* Input — re-enable pointer events just for the form */}
        <form onSubmit={handleSend} style={{ display: 'flex', gap: 8, pointerEvents: 'all' }}>
          <input value={text} onChange={e => setText(e.target.value)}
            placeholder="Say something..."
            style={{ flex: 1, padding: '8px 14px', borderRadius: 20, border: 'none', background: 'rgba(0,0,0,0.55)', color: 'white', fontSize: 13, fontFamily: "'DM Sans', sans-serif", backdropFilter: 'blur(4px)', outline: 'none' }} />
          <button type="submit" disabled={!text.trim()}
            style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: text.trim() ? '#EF4444' : 'rgba(255,255,255,0.2)', color: 'white', fontSize: 14, cursor: text.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            ➤
          </button>
        </form>
      </div>
    );
  }

  // Desktop: side panel
  return (
    <div style={s.chatPanel}>
      <div style={s.chatHeader}>💬 Comments</div>
      <div style={s.chatMessages}>
        {messages.length === 0 ? (
          <div style={{ fontSize: 13, color: '#94A3B8', textAlign: 'center', padding: '20px 0' }}>No comments yet. Say something! 👋</div>
        ) : messages.map((msg, i) => {
          const isMe = msg.userId === currentUser._id;
          return (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#2563EB', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'white', fontWeight: 700 }}>
                {msg.avatarUrl ? <img src={msg.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : msg.fullName?.[0]?.toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: isMe ? '#2563EB' : '#7C3AED', fontFamily: 'Geist, sans-serif' }}>{isMe ? 'You' : msg.fullName}</span>
                <p style={{ fontSize: 13, color: '#1E293B', margin: '2px 0 0', lineHeight: 1.4, wordBreak: 'break-word' }}>{msg.message}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSend} style={s.chatInput}>
        <input value={text} onChange={e => setText(e.target.value)} placeholder="Add a comment..." style={s.chatInputField} />
        <button type="submit" disabled={!text.trim()} style={{ ...s.chatSendBtn, opacity: text.trim() ? 1 : 0.5 }}>➤</button>
      </form>
    </div>
  );
};

// ── Create Stream Modal ────────────────────────────────────
const CreateStreamModal = ({ user, onClose, onCreate }) => {
  const [form, setForm] = useState({ title: '', description: '', category: 'general', scheduledFor: '', visibility: 'public' });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required.'); return; }
    setLoading(true); setError('');
    try {
      const payload = { ...form };
      if (!payload.scheduledFor) delete payload.scheduledFor;
      const res = await createStream(payload);
      onCreate(res.data.data.stream);
      onClose();
    } catch (err) { setError(err.response?.data?.message || 'Failed to create stream.'); }
    setLoading(false);
  };

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        <div style={s.modalHeader}>
          <h3 style={s.modalTitle}>🔴 Create Live Stream</h3>
          <button onClick={onClose} style={s.closeBtn}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', maxHeight: '75vh' }}>
          <div>
            <label style={s.label}>Stream Title *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. CSC 401 Exam Revision Session" style={s.input} required />
          </div>
          <div>
            <label style={s.label}>Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="What will you be covering?" rows={3} style={{ ...s.input, resize: 'none', height: 80 }} />
          </div>
          <div>
            <label style={s.label}>Category</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {CATEGORIES.map(cat => (
                <button key={cat.id} type="button" onClick={() => set('category', cat.id)}
                  style={{ padding: '6px 14px', borderRadius: 20, border: `2px solid ${form.category === cat.id ? cat.color : '#E2E8F0'}`, background: form.category === cat.id ? cat.color + '15' : 'white', color: form.category === cat.id ? cat.color : '#64748B', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={s.label}>Schedule For (optional)</label>
              <input type="datetime-local" value={form.scheduledFor} onChange={e => set('scheduledFor', e.target.value)} style={s.input} />
            </div>
            <div>
              <label style={s.label}>Visibility</label>
              <select value={form.visibility} onChange={e => set('visibility', e.target.value)} style={s.select}>
                <option value="public">🌐 Public</option>
                <option value="department">📚 My Department</option>
                <option value="faculty">🏫 My Faculty</option>
              </select>
            </div>
          </div>
          {error && <div style={s.errorBanner}>⚠️ {error}</div>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={s.cancelBtn}>Cancel</button>
            <button type="submit" disabled={loading} style={{ ...s.liveBtn, opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Creating...' : '🔴 Create Stream'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── LiveKit Video Grid (must be inside LiveKitRoom) ─────────
const LiveKitVideoGrid = ({ isHost }) => {
  const tracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: false },
     { source: Track.Source.ScreenShare, withPlaceholder: false }],
    { onlySubscribed: !isHost }  // host sees own local track; viewers only see subscribed tracks
  );

  if (tracks.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: 'white', height: '100%' }}>
        <div style={{ fontSize: 48 }}>📡</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>
          {isHost ? 'Starting your camera...' : 'Waiting for host to start...'}
        </div>
      </div>
    );
  }

  return (
    <GridLayout tracks={tracks} style={{ height: '100%' }}>
      <ParticipantTile />
    </GridLayout>
  );
};

// ── LiveKit Room Wrapper ────────────────────────────────────
const LiveKitStreamRoom = ({ stream, token, serverUrl, isHost, currentUser, socket, onLeave, onEnd }) => {
  const isMobile = useIsMobile();
  const cat      = getCategoryConfig(stream.category);
  const [duration, setDuration]       = useState('00:00');
  const [viewerCount, setViewerCount] = useState(stream.viewerCount || 0);
  const startedAtRef = useRef(stream.startedAt ? new Date(stream.startedAt) : null);

  useEffect(() => {
    if (!startedAtRef.current) startedAtRef.current = new Date();
    const t = setInterval(() => setDuration(formatDuration(startedAtRef.current)), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handler = ({ viewerCount: vc }) => setViewerCount(vc);
    socket.on('stream:viewer_count', handler);
    return () => socket.off('stream:viewer_count', handler);
  }, [socket]);

  const handleDisconnect = async () => {
    if (isHost) {
      socket?.emit('stream:end', { streamId: stream._id });
      await endStream(stream._id).catch(() => {});
      onEnd?.();
    } else {
      socket?.emit('stream:leave', { streamId: stream._id });
      await leaveStream(stream._id).catch(() => {});
      onLeave?.();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: isMobile ? 'auto' : 'calc(100vh - 100px)', gap: 16, fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0F172A', borderRadius: 16, overflow: 'hidden', minWidth: 0, position: 'relative' }}>
        {/* Info bar with action buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(0,0,0,0.4)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={s.livePill}>🔴 LIVE</div>
            <span style={s.durationBadge}>{duration}</span>
            <span style={s.viewerBadge}>👁️ {viewerCount}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontFamily: 'Geist, sans-serif', fontWeight: 700, fontSize: 15, color: 'white' }}>{stream.title}</div>
            {isHost ? (
              <button onClick={handleDisconnect}
                style={{ padding: '6px 14px', borderRadius: 20, border: 'none', background: '#EF4444', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Geist, sans-serif' }}>
                ⏹ End
              </button>
            ) : (
              <button onClick={handleDisconnect}
                style={{ padding: '6px 14px', borderRadius: 20, border: '1.5px solid rgba(255,255,255,0.3)', background: 'transparent', color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Geist, sans-serif' }}>
                ← Leave
              </button>
            )}
          </div>
        </div>

        {/* LiveKit room — fills remaining space */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <LiveKitRoom
            token={token}
            serverUrl={serverUrl}
            connect={true}
            video={isHost}
            audio={isHost}
            onDisconnected={handleDisconnect}
            style={{ height: '100%', background: '#0F172A' }}
          >
            <RoomAudioRenderer />
            <div style={{ height: isHost ? 'calc(100% - 52px)' : '100%' }}>
              <LiveKitVideoGrid isHost={isHost} />
            </div>
            {isHost && (
              <div style={{ background: 'rgba(0,0,0,0.7)', padding: '8px 16px', display: 'flex', justifyContent: 'center' }}>
                <ControlBar
                  variation="minimal"
                  controls={{ microphone: true, camera: true, screenShare: true, leave: false, chat: false }}
                  style={{ '--lk-control-bar-bg': 'transparent', color: 'white' }}
                />
              </div>
            )}
          </LiveKitRoom>
        </div>

        {/* Stream info */}
        <div style={{ padding: '12px 16px', background: '#0F172A', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar user={stream.host} size={34} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'Geist, sans-serif', fontWeight: 700, fontSize: 14, color: 'white' }}>{stream.host?.fullName}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{stream.host?.department}</div>
            </div>
            <span style={{ fontSize: 11, background: cat.color + '30', color: cat.color, borderRadius: 20, padding: '3px 10px', fontWeight: 700, border: `1px solid ${cat.color}50` }}>
              {cat.label}
            </span>
          </div>
        </div>

        {/* Mobile: overlay chat on video */}
        {isMobile && (
          <LiveChat streamId={stream._id} currentUser={currentUser} socket={socket} overlay={true} />
        )}
      </div>

      {/* Desktop: side chat panel */}
      {!isMobile && (
        <div style={{ width: 300, flexShrink: 0 }}>
          <LiveChat streamId={stream._id} currentUser={currentUser} socket={socket} overlay={false} />
        </div>
      )}
    </div>
  );
};

// ── Broadcaster View ───────────────────────────────────────
const BroadcasterView = ({ stream, currentUser, socket, onEnd }) => {
  const [token, setToken]       = useState(null);
  const [serverUrl, setServerUrl] = useState(null);
  const [starting, setStarting] = useState(false);
  const [error, setError]       = useState('');

  const handleGoLive = async () => {
    setStarting(true); setError('');
    try {
      if (stream.status !== 'live') await startStream(stream._id);
      const res = await getLiveKitToken(stream._id);
      socket?.emit('stream:host', { streamId: stream._id, userId: currentUser._id });
      setServerUrl(res.data.data.serverUrl);
      setToken(res.data.data.token);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start stream.');
    }
    setStarting(false);
  };

  if (!token) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 100px)', background: '#0F172A', borderRadius: 16 }}>
        <div style={{ textAlign: 'center', color: 'white', padding: 24 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🎥</div>
          <h2 style={{ fontFamily: 'Geist, sans-serif', fontWeight: 800, fontSize: 22, marginBottom: 8 }}>{stream.title}</h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 24, maxWidth: 320, margin: '0 auto 24px' }}>
            You're about to go live. Your camera and mic will turn on.
          </p>
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid #EF4444', borderRadius: 10, padding: '10px 16px', fontSize: 13, marginBottom: 16 }}>
              ⚠️ {error}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button onClick={onEnd} style={{ padding: '12px 24px', borderRadius: 10, border: '1.5px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              ← Cancel
            </button>
            <button onClick={handleGoLive} disabled={starting} style={{ ...s.liveBtn, fontSize: 15, padding: '12px 32px', opacity: starting ? 0.7 : 1 }}>
              {starting ? 'Starting...' : '🔴 Go Live'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <LiveKitStreamRoom
      stream={stream} token={token} serverUrl={serverUrl}
      isHost={true} currentUser={currentUser} socket={socket} onEnd={onEnd}
    />
  );
};

// ── Viewer View ────────────────────────────────────────────
const ViewerView = ({ stream, currentUser, socket, onLeave }) => {
  const [token, setToken]         = useState(null);
  const [serverUrl, setServerUrl] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  useEffect(() => {
    const fetchToken = async () => {
      try {
        await joinStream(stream._id);
        socket?.emit('stream:join', { streamId: stream._id, userId: currentUser._id });
        const res = await getLiveKitToken(stream._id);
        setServerUrl(res.data.data.serverUrl);
        setToken(res.data.data.token);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to join stream.');
      }
      setLoading(false);
    };
    fetchToken();
  }, [stream._id]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 100px)', background: '#0F172A', borderRadius: 16 }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <div style={{ width: 44, height: 44, border: '3px solid rgba(255,255,255,0.2)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 16px' }} />
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>Joining stream...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 100px)', background: '#0F172A', borderRadius: 16 }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontSize: 14, marginBottom: 20 }}>{error}</div>
          <button onClick={onLeave} style={{ ...s.liveBtn, background: 'white', color: '#0F172A' }}>← Back</button>
        </div>
      </div>
    );
  }

  return (
    <LiveKitStreamRoom
      stream={stream} token={token} serverUrl={serverUrl}
      isHost={false} currentUser={currentUser} socket={socket} onLeave={onLeave}
    />
  );
};

// ── Stream Card ────────────────────────────────────────────
const StreamCard = ({ stream, onJoin }) => {
  const cat = getCategoryConfig(stream.category);
  const isLive = stream.status === 'live';
  return (
    <div onClick={() => onJoin(stream)} style={s.streamCard}
      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
    >
      <div style={{ ...s.streamThumb, background: `linear-gradient(135deg, #0F172A, ${cat.color}40)` }}>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 36 }}>📡</div>
          {isLive && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444', animation: 'pulse 1.5s ease infinite' }} />
              <span style={{ fontSize: 12, color: 'white', fontWeight: 700 }}>{stream.viewerCount} watching</span>
            </div>
          )}
        </div>
        <div style={{ position: 'absolute', top: 10, left: 10 }}>
          {isLive ? <span style={s.livePill}>🔴 LIVE</span> : <span style={{ ...s.livePill, background: '#334155', color: '#94A3B8' }}>📅 Scheduled</span>}
        </div>
        <div style={{ position: 'absolute', top: 10, right: 10 }}>
          <span style={{ fontSize: 11, background: cat.color + '30', color: 'white', borderRadius: 20, padding: '3px 10px', fontWeight: 700, backdropFilter: 'blur(4px)', border: `1px solid ${cat.color}50` }}>
            {cat.label}
          </span>
        </div>
      </div>
      <div style={{ padding: '12px 14px' }}>
        <div style={{ fontFamily: 'Geist, sans-serif', fontWeight: 700, fontSize: 14, color: '#0F172A', marginBottom: 6, lineHeight: 1.3 }}>{stream.title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar user={stream.host} size={24} />
          <span style={{ fontSize: 12, color: '#64748B', fontWeight: 500 }}>{stream.host?.fullName}</span>
        </div>
        {stream.scheduledFor && !isLive && (
          <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 6 }}>
            📅 {new Date(stream.scheduledFor).toLocaleString('en-NG', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Main Live Page ─────────────────────────────────────────
const LivePage = () => {
  const { user }  = useAuthStore();
  const socket    = useSocket();
  const isMobile  = useIsMobile();

  const [streams, setStreams]               = useState([]);
  const [loading, setLoading]               = useState(true);
  const [activeStream, setActiveStream]     = useState(null);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [showCreate, setShowCreate]         = useState(false);
  const [activeTab, setActiveTab]           = useState('live');

  useEffect(() => { loadStreams(); }, [activeTab]);

  useEffect(() => {
    if (!socket) return;
    const handler = (stream) => setStreams(p => [stream, ...p]);
    socket.on('stream:started', handler);
    return () => socket.off('stream:started', handler);
  }, [socket]);

  const loadStreams = async () => {
    setLoading(true);
    try {
      const statusMap = { live: 'live', scheduled: 'scheduled', my: 'all' };
      const res = await getStreams({ status: statusMap[activeTab] || 'live', limit: 20 });
      let items = res.data.data.streams;
      if (activeTab === 'my') items = items.filter(s => s.host?._id === user?._id || s.host === user?._id);
      setStreams(items);
    } catch (_) {}
    setLoading(false);
  };

  const handleJoinStream = (stream) => {
    const isOwn = stream.host?._id === user?._id || stream.host === user?._id;
    if (!isOwn && stream.status !== 'live') {
      alert("This stream hasn't started yet.");
      return;
    }
    setActiveStream(stream);
    setIsBroadcasting(isOwn);
  };

  const handleStreamCreated = (stream) => {
    setStreams(p => [stream, ...p]);
    setActiveStream(stream);
    setIsBroadcasting(true);
  };

  const handleLeave = () => {
    setActiveStream(null);
    setIsBroadcasting(false);
    loadStreams();
  };

  if (activeStream) {
    return isBroadcasting
      ? <BroadcasterView stream={activeStream} currentUser={user} socket={socket} onEnd={handleLeave} />
      : <ViewerView stream={activeStream} currentUser={user} socket={socket} onLeave={handleLeave} />;
  }

  return (
    <div style={{ paddingBottom: isMobile ? 96 : 40, fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        input:focus, select:focus, textarea:focus { outline: none; }
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .lk-button { background: rgba(255,255,255,0.15) !important; color: white !important; border: 1.5px solid rgba(255,255,255,0.25) !important; border-radius: 10px !important; }
        .lk-button:hover { background: rgba(255,255,255,0.28) !important; }
        .lk-button svg { color: white !important; fill: white !important; }
        .lk-control-bar { background: transparent !important; gap: 8px !important; }
        .lk-media-device-select { background: #1E293B !important; border: 1px solid rgba(255,255,255,0.15) !important; border-radius: 12px !important; padding: 6px !important; box-shadow: 0 8px 32px rgba(0,0,0,0.5) !important; min-width: 220px !important; overflow: hidden !important; }
        .lk-media-device-select li { padding: 10px 14px !important; color: white !important; font-family: 'DM Sans', sans-serif !important; font-size: 13px !important; border-radius: 8px !important; cursor: pointer !important; transition: background 0.15s !important; list-style: none !important; }
        .lk-media-device-select li:hover { background: rgba(255,255,255,0.1) !important; }
        .lk-media-device-select li[aria-selected="true"] { background: #2563EB !important; font-weight: 600 !important; }
        .lk-media-device-select li[aria-selected="true"]::before { content: '✓ ' !important; }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: isMobile ? 14 : 20 }}>
        <div>
          <h1 style={{ fontFamily: 'Geist, sans-serif', fontWeight: 800, fontSize: isMobile ? 22 : 26, color: '#0F172A', margin: 0 }}>🔴 Live</h1>
          <p style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>Watch and host live sessions on campus</p>
        </div>
        <button onClick={() => setShowCreate(true)} style={s.liveBtn}>+ Go Live</button>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'white', padding: 5, borderRadius: 12, border: '1px solid #E2E8F0' }}>
        {[{ id: 'live', label: '🔴 Live Now' }, { id: 'scheduled', label: '📅 Scheduled' }, { id: 'my', label: '👤 My Streams' }].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', background: activeTab === tab.id ? '#0F172A' : 'transparent', color: activeTab === tab.id ? 'white' : '#64748B', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
            {tab.label}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div style={{ width: 28, height: 28, border: '3px solid #E2E8F0', borderTopColor: '#EF4444', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        </div>
      )}

      {!loading && (streams.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <span style={{ fontSize: 56, display: 'block', marginBottom: 16 }}>📡</span>
          <h3 style={{ fontFamily: 'Geist, sans-serif', fontWeight: 700, fontSize: 20, color: '#0F172A', marginBottom: 8 }}>
            {activeTab === 'live' ? 'No live streams right now' : activeTab === 'scheduled' ? 'No scheduled streams' : "You haven't streamed yet"}
          </h3>
          <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6, maxWidth: 300, margin: '0 auto 20px' }}>
            {activeTab === 'live' ? 'Be the first to go live! Share a lecture, tutorial, or campus event.'
              : activeTab === 'scheduled' ? 'Schedule a stream so your audience can prepare ahead of time.'
              : 'Start your first live session and connect with your classmates.'}
          </p>
          <button onClick={() => setShowCreate(true)} style={s.liveBtn}>🔴 Go Live Now</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(240px, 1fr))', gap: isMobile ? 10 : 16 }}>
          {streams.map(stream => <StreamCard key={stream._id} stream={stream} onJoin={handleJoinStream} />)}
        </div>
      ))}

      {showCreate && <CreateStreamModal user={user} onClose={() => setShowCreate(false)} onCreate={handleStreamCreated} />}
    </div>
  );
};

// ─── Styles ───────────────────────────────────────────────
const s = {
  liveBtn:      { padding: '9px 20px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #DC2626, #EF4444)', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Geist, sans-serif', boxShadow: '0 3px 12px rgba(220,38,38,0.35)', whiteSpace: 'nowrap' },
  streamCard:   { background: 'white', borderRadius: 16, overflow: 'hidden', border: '1px solid #E2E8F0', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  streamThumb:  { aspectRatio: '16/9', position: 'relative', overflow: 'hidden' },
  livePill:     { background: '#EF4444', color: 'white', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 800, fontFamily: 'Geist, sans-serif', display: 'inline-flex', alignItems: 'center', gap: 4 },
  durationBadge:{ background: 'rgba(0,0,0,0.5)', color: 'white', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600 },
  viewerBadge:  { background: 'rgba(0,0,0,0.5)', color: 'white', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600 },
  chatPanel:    { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: 'white', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden' },
  chatHeader:   { padding: '14px 16px', borderBottom: '1px solid #F1F5F9', fontFamily: 'Geist, sans-serif', fontWeight: 700, fontSize: 14, color: '#0F172A', flexShrink: 0 },
  chatMessages: { flex: 1, overflowY: 'auto', padding: '12px 14px' },
  chatInput:    { display: 'flex', gap: 8, padding: '10px 12px', borderTop: '1px solid #F1F5F9', flexShrink: 0 },
  chatInputField: { flex: 1, padding: '8px 12px', border: '1.5px solid #E2E8F0', borderRadius: 20, fontSize: 13, color: '#0F172A', background: '#F8FAFC', fontFamily: "'DM Sans', sans-serif" },
  chatSendBtn:  { width: 34, height: 34, borderRadius: '50%', border: 'none', background: '#EF4444', color: 'white', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  overlay:      { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 },
  modal:        { background: 'white', borderRadius: 20, width: '100%', maxWidth: 520, boxShadow: '0 24px 80px rgba(0,0,0,0.2)', overflow: 'hidden' },
  modalHeader:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid #F1F5F9' },
  modalTitle:   { fontFamily: 'Geist, sans-serif', fontWeight: 700, fontSize: 17, color: '#0F172A', margin: 0 },
  closeBtn:     { background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#94A3B8' },
  label:        { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 5 },
  input:        { width: '100%', padding: '10px 12px', border: '1.5px solid #E2E8F0', borderRadius: 10, fontSize: 14, color: '#0F172A', background: '#F8FAFC', fontFamily: "'DM Sans', sans-serif" },
  select:       { width: '100%', padding: '10px 12px', border: '1.5px solid #E2E8F0', borderRadius: 10, fontSize: 14, color: '#0F172A', background: '#F8FAFC', fontFamily: "'DM Sans', sans-serif" },
  cancelBtn:    { padding: '9px 20px', border: '1.5px solid #E2E8F0', borderRadius: 10, background: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#374151', fontFamily: 'Geist, sans-serif' },
  errorBanner:  { background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#DC2626' },
};

export default LivePage;
