import { useState, useEffect, useRef, useCallback } from 'react';
import useIsMobile from '../../hooks/useIsMobile';
import { useNavigate, useParams } from 'react-router-dom';
import useAuthStore from '../../context/useAuthStore';
import { useSocket } from '../../context/SocketContext';
import {
  getStreams, getStream, createStream,
  startStream, endStream, joinStream,
  leaveStream, deleteStream,
} from '../../services/liveService';

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
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
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

// ── Create Stream Modal ────────────────────────────────────
const CreateStreamModal = ({ user, onClose, onCreate }) => {
  const [form, setForm] = useState({
    title: '', description: '', category: 'general',
    scheduledFor: '', visibility: 'public',
    targetDepartment: user?.department || '',
    targetFaculty: user?.faculty || '',
  });
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
      if (payload.visibility === 'public') { delete payload.targetDepartment; delete payload.targetFaculty; }
      const res = await createStream(payload);
      onCreate(res.data.data.stream);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create stream.');
    }
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
            <input value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="e.g. CSC 401 Exam Revision Session" style={s.input} required />
          </div>
          <div>
            <label style={s.label}>Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="What will you be covering?" rows={3}
              style={{ ...s.input, resize: 'none', height: 80 }} />
          </div>
          <div>
            <label style={s.label}>Category</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {CATEGORIES.map(cat => (
                <button key={cat.id} type="button" onClick={() => set('category', cat.id)}
                  style={{ padding: '6px 14px', borderRadius: 20, border: `2px solid ${form.category === cat.id ? cat.color : '#E2E8F0'}`, background: form.category === cat.id ? cat.color + '15' : 'white', color: form.category === cat.id ? cat.color : '#64748B', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', fontFamily: "'DM Sans', sans-serif" }}>
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
            <button type="submit" disabled={loading}
              style={{ ...s.liveBtn, opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Creating...' : '🔴 Create Stream'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Live Chat ──────────────────────────────────────────────
const LiveChat = ({ streamId, currentUser, socket }) => {
  const [messages, setMessages] = useState([]);
  const [text, setText]         = useState('');
  const bottomRef               = useRef(null);

  useEffect(() => {
    if (!socket) return;
    const handler = (msg) => {
      setMessages(p => [...p.slice(-199), msg]); // keep last 200 messages
    };
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
      streamId,
      userId:    currentUser._id,
      fullName:  currentUser.fullName,
      avatarUrl: currentUser.avatarUrl,
      message:   text.trim(),
    });
    setText('');
  };

  return (
    <div style={s.chatPanel}>
      <div style={s.chatHeader}>💬 Live Chat</div>
      <div style={s.chatMessages}>
        {messages.length === 0 ? (
          <div style={{ fontSize: 13, color: '#94A3B8', textAlign: 'center', padding: '20px 0' }}>
            No messages yet. Say something! 👋
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMe = msg.userId === currentUser._id;
            return (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#2563EB', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'white', fontWeight: 700 }}>
                  {msg.avatarUrl
                    ? <img src={msg.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : msg.fullName?.[0]?.toUpperCase()
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: isMe ? '#2563EB' : '#7C3AED', fontFamily: 'Geist, sans-serif' }}>
                    {isMe ? 'You' : msg.fullName}
                  </span>
                  <p style={{ fontSize: 13, color: '#1E293B', margin: '2px 0 0', lineHeight: 1.4, wordBreak: 'break-word' }}>
                    {msg.message}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSend} style={s.chatInput}>
        <input value={text} onChange={e => setText(e.target.value)}
          placeholder="Send a message..." style={s.chatInputField} />
        <button type="submit" disabled={!text.trim()}
          style={{ ...s.chatSendBtn, opacity: text.trim() ? 1 : 0.5 }}>➤</button>
      </form>
    </div>
  );
};

// ── Broadcaster View ───────────────────────────────────────
const BroadcasterView = ({ stream, currentUser, socket, onEnd }) => {
  const isMobile = useIsMobile();
  const videoRef       = useRef(null);
  const mediaRef       = useRef(null);
  const recorderRef    = useRef(null);
  const [isLive, setIsLive]         = useState(stream.status === 'live');
  const [duration, setDuration]     = useState('00:00');
  const [viewerCount, setViewerCount] = useState(stream.viewerCount || 0);
  const [cameraOn, setCameraOn]     = useState(true);
  const [micOn, setMicOn]           = useState(true);
  const [starting, setStarting]     = useState(false);
  const [error, setError]           = useState('');
  const durationRef = useRef(null);

  // Listen for viewer count updates
  useEffect(() => {
    if (!socket) return;
    const onViewerCount = ({ viewerCount: vc }) => setViewerCount(vc);
    socket.on('stream:viewer_count', onViewerCount);
    return () => socket.off('stream:viewer_count', onViewerCount);
  }, [socket]);

  // Duration ticker
  useEffect(() => {
    if (!isLive) return;
    durationRef.current = setInterval(() => {
      setDuration(formatDuration(stream.startedAt || new Date()));
    }, 1000);
    return () => clearInterval(durationRef.current);
  }, [isLive]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      mediaRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.muted = true; // mute self-preview
      }
      return mediaStream;
    } catch (err) {
      setError('Camera/microphone access denied. Please allow access and try again.');
      return null;
    }
  };

  const handleGoLive = async () => {
    setStarting(true); setError('');
    const mediaStream = await startCamera();
    if (!mediaStream) { setStarting(false); return; }

    try {
      await startStream(stream._id);

      // Join socket room as host
      socket?.emit('stream:host', { streamId: stream._id, userId: currentUser._id });

      // Start MediaRecorder — send chunks via socket
      const recorder = new MediaRecorder(mediaStream, {
        mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm',
      });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0 && socket) {
          // Convert blob to ArrayBuffer for socket transmission
          e.data.arrayBuffer().then(buffer => {
            socket.emit('stream:chunk', { streamId: stream._id, chunk: buffer });
          });
        }
      };

      recorder.start(500); // send chunk every 500ms
      recorderRef.current = recorder;
      setIsLive(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to go live.');
      mediaStream.getTracks().forEach(t => t.stop());
    }
    setStarting(false);
  };

  const handleEndStream = async () => {
    if (!window.confirm('Are you sure you want to end the stream?')) return;

    // Stop recorder
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }

    // Stop camera
    mediaRef.current?.getTracks().forEach(t => t.stop());

    // Tell socket
    socket?.emit('stream:end', { streamId: stream._id });

    // API call
    await endStream(stream._id).catch(() => {});
    clearInterval(durationRef.current);
    onEnd();
  };

  const toggleCamera = () => {
    const track = mediaRef.current?.getVideoTracks()[0];
    if (track) { track.enabled = !track.enabled; setCameraOn(p => !p); }
  };

  const toggleMic = () => {
    const track = mediaRef.current?.getAudioTracks()[0];
    if (track) { track.enabled = !track.enabled; setMicOn(p => !p); }
  };

  const cat = getCategoryConfig(stream.category);

  return (
    <div style={{ ...s.streamLayout, flexDirection: isMobile ? 'column' : 'row', height: isMobile ? 'auto' : 'calc(100vh - 100px)' }}>
      {/* Video area */}
      <div style={s.videoArea}>
        {/* Stream info bar */}
        <div style={s.streamInfoBar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isLive
              ? <div style={s.livePill}>🔴 LIVE</div>
              : <div style={{ ...s.livePill, background: '#F1F5F9', color: '#64748B' }}>⏳ Not Live Yet</div>
            }
            {isLive && <span style={s.durationBadge}>{duration}</span>}
            <span style={s.viewerBadge}>👁️ {viewerCount}</span>
          </div>
          <div style={{ fontFamily: 'Geist, sans-serif', fontWeight: 700, fontSize: 15, color: 'white', textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
            {stream.title}
          </div>
        </div>

        {/* Video preview */}
        <div style={s.videoContainer}>
          <video ref={videoRef} autoPlay playsInline style={s.video} />
          {!isLive && (
            <div style={s.previewOverlay}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 52, marginBottom: 12 }}>🎥</div>
                <div style={{ fontFamily: 'Geist, sans-serif', fontWeight: 700, fontSize: 18, color: 'white', marginBottom: 8 }}>
                  {starting ? 'Starting your stream...' : 'Ready to go live?'}
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 20 }}>
                  Your camera preview will appear here
                </div>
                {error && (
                  <div style={{ background: 'rgba(239,68,68,0.9)', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: 'white', marginBottom: 16, maxWidth: 320 }}>
                    ⚠️ {error}
                  </div>
                )}
                <button onClick={handleGoLive} disabled={starting}
                  style={{ ...s.liveBtn, fontSize: 16, padding: '14px 36px', opacity: starting ? 0.7 : 1 }}>
                  {starting ? 'Starting...' : '🔴 Go Live'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        {isLive && (
          <div style={s.controls}>
            <button onClick={toggleCamera} style={{ ...s.controlBtn, background: cameraOn ? 'rgba(255,255,255,0.15)' : '#EF4444' }}>
              {cameraOn ? '📹' : '📷'} {cameraOn ? 'Camera' : 'Off'}
            </button>
            <button onClick={toggleMic} style={{ ...s.controlBtn, background: micOn ? 'rgba(255,255,255,0.15)' : '#EF4444' }}>
              {micOn ? '🎙️' : '🔇'} {micOn ? 'Mic' : 'Muted'}
            </button>
            <button onClick={handleEndStream} style={{ ...s.controlBtn, background: '#EF4444', fontWeight: 700 }}>
              ⏹ End Stream
            </button>
          </div>
        )}
      </div>

      {/* Live chat */}
      <div style={{ width: isMobile ? '100%' : 300, height: isMobile ? 280 : undefined, flexShrink: 0 }}><LiveChat streamId={stream._id} currentUser={currentUser} socket={socket} /></div>
    </div>
  );
};

// ── Viewer View ────────────────────────────────────────────
const ViewerView = ({ stream, currentUser, socket, onLeave }) => {
  const isMobile = useIsMobile();
  const videoRef      = useRef(null);
  const mediaSourceRef = useRef(null);
  const sourceBufferRef = useRef(null);
  const queueRef      = useRef([]);
  const [viewerCount, setViewerCount] = useState(stream.viewerCount || 0);
  const [streamEnded, setStreamEnded] = useState(false);
  const [duration, setDuration]       = useState('00:00');
  const [buffering, setBuffering]     = useState(true);
  const [error, setError]             = useState('');

  useEffect(() => {
    // Join stream room
    socket?.emit('stream:join', { streamId: stream._id, userId: currentUser._id });
    joinStream(stream._id).catch(() => {});

    // Duration ticker
    const ticker = setInterval(() => setDuration(formatDuration(stream.startedAt)), 1000);

    // Setup MediaSource for video playback
    if ('MediaSource' in window) {
      const ms = new MediaSource();
      mediaSourceRef.current = ms;
      if (videoRef.current) videoRef.current.src = URL.createObjectURL(ms);

      ms.addEventListener('sourceopen', () => {
        try {
          const mimeType = MediaSource.isTypeSupported('video/webm;codecs=vp9')
            ? 'video/webm;codecs=vp9' : 'video/webm';
          const sb = ms.addSourceBuffer(mimeType);
          sourceBufferRef.current = sb;

          sb.addEventListener('updateend', () => {
            if (queueRef.current.length > 0 && !sb.updating) {
              sb.appendBuffer(queueRef.current.shift());
            }
            setBuffering(false);
          });

          // Play when buffer is ready
          videoRef.current?.play().catch(() => {});
        } catch (err) {
          setError('Your browser may not support this stream format.');
        }
      });
    } else {
      setError('Live streaming requires a modern browser (Chrome, Edge, Firefox).');
    }

    return () => {
      clearInterval(ticker);
      socket?.emit('stream:leave', { streamId: stream._id, userId: currentUser._id });
      leaveStream(stream._id).catch(() => {});
    };
  }, [stream._id]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    const onChunk = ({ chunk }) => {
      const sb = sourceBufferRef.current;
      if (!sb) return;
      const buffer = chunk instanceof ArrayBuffer ? chunk : new Uint8Array(chunk).buffer;
      if (sb.updating || queueRef.current.length > 0) {
        queueRef.current.push(buffer);
      } else {
        try { sb.appendBuffer(buffer); } catch (_) {}
      }
    };

    const onViewerCount = ({ viewerCount: vc }) => setViewerCount(vc);

    const onEnded = () => {
      setStreamEnded(true);
      mediaSourceRef.current?.endOfStream?.();
    };

    socket.on('stream:chunk', onChunk);
    socket.on('stream:viewer_count', onViewerCount);
    socket.on('stream:ended', onEnded);

    return () => {
      socket.off('stream:chunk', onChunk);
      socket.off('stream:viewer_count', onViewerCount);
      socket.off('stream:ended', onEnded);
    };
  }, [socket]);

  const cat = getCategoryConfig(stream.category);

  return (
    <div style={{ ...s.streamLayout, flexDirection: isMobile ? 'column' : 'row', height: isMobile ? 'auto' : 'calc(100vh - 100px)' }}>
      {/* Video area */}
      <div style={s.videoArea}>
        {/* Info bar */}
        <div style={s.streamInfoBar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={s.livePill}>🔴 LIVE</div>
            <span style={s.durationBadge}>{duration}</span>
            <span style={s.viewerBadge}>👁️ {viewerCount}</span>
          </div>
          <button onClick={onLeave} style={{ ...s.controlBtn, background: 'rgba(255,255,255,0.15)', fontSize: 13 }}>
            ← Leave
          </button>
        </div>

        <div style={s.videoContainer}>
          <video ref={videoRef} autoPlay playsInline style={s.video} />

          {/* Buffering spinner */}
          {buffering && !streamEnded && (
            <div style={s.bufferingOverlay}>
              <div style={{ width: 44, height: 44, border: '3px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              <div style={{ color: 'white', fontSize: 13, marginTop: 12 }}>Connecting to stream...</div>
            </div>
          )}

          {/* Stream ended overlay */}
          {streamEnded && (
            <div style={s.bufferingOverlay}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 52, marginBottom: 12 }}>📴</div>
                <div style={{ fontFamily: 'Geist, sans-serif', fontWeight: 700, fontSize: 18, color: 'white', marginBottom: 8 }}>Stream Ended</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 20 }}>The host has ended the stream.</div>
                <button onClick={onLeave} style={{ ...s.liveBtn, background: 'white', color: '#0F172A' }}>← Back to Streams</button>
              </div>
            </div>
          )}

          {/* Error overlay */}
          {error && (
            <div style={s.bufferingOverlay}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
                <div style={{ fontSize: 14, color: 'white', marginBottom: 16, maxWidth: 300 }}>{error}</div>
                <button onClick={onLeave} style={{ ...s.liveBtn, background: 'white', color: '#0F172A' }}>← Back</button>
              </div>
            </div>
          )}
        </div>

        {/* Stream info below video */}
        <div style={{ padding: '14px 16px', background: '#0F172A' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar user={stream.host} size={38} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'Geist, sans-serif', fontWeight: 700, fontSize: 15, color: 'white' }}>{stream.title}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{stream.host?.fullName} · {stream.host?.department}</div>
            </div>
            <span style={{ fontSize: 11, background: cat.color + '30', color: cat.color, borderRadius: 20, padding: '3px 10px', fontWeight: 700, border: `1px solid ${cat.color}50` }}>
              {cat.label}
            </span>
          </div>
          {stream.description && (
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 8, lineHeight: 1.5 }}>
              {stream.description}
            </p>
          )}
        </div>
      </div>

      {/* Live chat */}
      <div style={{ width: isMobile ? '100%' : 300, height: isMobile ? 280 : undefined, flexShrink: 0 }}><LiveChat streamId={stream._id} currentUser={currentUser} socket={socket} /></div>
    </div>
  );
};

// ── Stream Card (discovery list) ───────────────────────────
const StreamCard = ({ stream, onJoin }) => {
  const cat = getCategoryConfig(stream.category);
  const isLive = stream.status === 'live';

  return (
    <div onClick={() => onJoin(stream)} style={s.streamCard}
      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
    >
      {/* Thumbnail placeholder */}
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
        {/* Status badge */}
        <div style={{ position: 'absolute', top: 10, left: 10 }}>
          {isLive
            ? <span style={s.livePill}>🔴 LIVE</span>
            : <span style={{ ...s.livePill, background: '#334155', color: '#94A3B8' }}>📅 Scheduled</span>
          }
        </div>
        {/* Category badge */}
        <div style={{ position: 'absolute', top: 10, right: 10 }}>
          <span style={{ fontSize: 11, background: cat.color + '30', color: 'white', borderRadius: 20, padding: '3px 10px', fontWeight: 700, backdropFilter: 'blur(4px)', border: `1px solid ${cat.color}50` }}>
            {cat.label}
          </span>
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: '12px 14px' }}>
        <div style={{ fontFamily: 'Geist, sans-serif', fontWeight: 700, fontSize: 14, color: '#0F172A', marginBottom: 6, lineHeight: 1.3 }}>
          {stream.title}
        </div>
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
  const navigate  = useNavigate();

  const [streams, setStreams]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [activeStream, setActiveStream] = useState(null);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [showCreate, setShowCreate]   = useState(false);
  const [activeTab, setActiveTab]     = useState('live'); // live | scheduled | my

  useEffect(() => {
    loadStreams();
  }, [activeTab]);

  // Real-time new stream notifications
  useEffect(() => {
    if (!socket) return;
    const handler = (stream) => {
      setStreams(p => [stream, ...p]);
    };
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

  const handleJoinStream = async (stream) => {
    if (stream.host?._id === user?._id || stream.host === user?._id) {
      // Own stream — go to broadcaster view
      setActiveStream(stream);
      setIsBroadcasting(true);
    } else {
      if (stream.status !== 'live') {
        alert('This stream hasn\'t started yet. Come back when it goes live!');
        return;
      }
      setActiveStream(stream);
      setIsBroadcasting(false);
    }
  };

  const handleStreamCreated = (stream) => {
    setStreams(p => [stream, ...p]);
    // Go straight to broadcaster view
    setActiveStream(stream);
    setIsBroadcasting(true);
  };

  const handleLeave = () => {
    setActiveStream(null);
    setIsBroadcasting(false);
    loadStreams();
  };

  // ── Active Stream View ───────────────────────────────────
  if (activeStream) {
    if (isBroadcasting) {
      return (
        <BroadcasterView
          stream={activeStream}
          currentUser={user}
          socket={socket}
          onEnd={handleLeave}
        />
      );
    } else {
      return (
        <ViewerView
          stream={activeStream}
          currentUser={user}
          socket={socket}
          onLeave={handleLeave}
        />
      );
    }
  }

  // ── Discovery View ───────────────────────────────────────
  return (
    <div style={{ paddingBottom: 80, fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        input:focus, select:focus, textarea:focus { outline: none; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'Geist, sans-serif', fontWeight: 800, fontSize: 26, color: '#0F172A', margin: 0 }}>
            🔴 Live
          </h1>
          <p style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>Watch and host live sessions on campus</p>
        </div>
        <button onClick={() => setShowCreate(true)} style={s.liveBtn}>
          + Go Live
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'white', padding: 5, borderRadius: 12, border: '1px solid #E2E8F0' }}>
        {[
          { id: 'live',      label: '🔴 Live Now' },
          { id: 'scheduled', label: '📅 Scheduled' },
          { id: 'my',        label: '👤 My Streams' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', background: activeTab === tab.id ? '#0F172A' : 'transparent', color: activeTab === tab.id ? 'white' : '#64748B', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', fontFamily: "'DM Sans', sans-serif" }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div style={{ width: 28, height: 28, border: '3px solid #E2E8F0', borderTopColor: '#EF4444', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        </div>
      )}

      {/* Streams grid */}
      {!loading && (
        streams.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <span style={{ fontSize: 56, display: 'block', marginBottom: 16 }}>📡</span>
            <h3 style={{ fontFamily: 'Geist, sans-serif', fontWeight: 700, fontSize: 20, color: '#0F172A', marginBottom: 8 }}>
              {activeTab === 'live'      ? 'No live streams right now'  :
               activeTab === 'scheduled' ? 'No scheduled streams'        :
               'You haven\'t streamed yet'}
            </h3>
            <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6, maxWidth: 300, margin: '0 auto 20px' }}>
              {activeTab === 'live'
                ? 'Be the first to go live! Share a lecture, tutorial, or campus event.'
                : activeTab === 'scheduled'
                ? 'Schedule a stream so your audience can prepare ahead of time.'
                : 'Start your first live session and connect with your classmates.'
              }
            </p>
            <button onClick={() => setShowCreate(true)} style={s.liveBtn}>
              🔴 Go Live Now
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
            {streams.map(stream => (
              <StreamCard key={stream._id} stream={stream} onJoin={handleJoinStream} />
            ))}
          </div>
        )
      )}

      {showCreate && (
        <CreateStreamModal
          user={user}
          onClose={() => setShowCreate(false)}
          onCreate={handleStreamCreated}
        />
      )}
    </div>
  );
};

// ─── Styles ───────────────────────────────────────────────
const s = {
  liveBtn: { padding: '9px 20px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #DC2626, #EF4444)', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Geist, sans-serif', boxShadow: '0 3px 12px rgba(220,38,38,0.35)', whiteSpace: 'nowrap' },

  streamCard: { background: 'white', borderRadius: 16, overflow: 'hidden', border: '1px solid #E2E8F0', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  streamThumb: { aspectRatio: '16/9', position: 'relative', overflow: 'hidden' },

  livePill: { background: '#EF4444', color: 'white', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 800, fontFamily: 'Geist, sans-serif', display: 'inline-flex', alignItems: 'center', gap: 4 },
  durationBadge: { background: 'rgba(0,0,0,0.5)', color: 'white', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600 },
  viewerBadge:   { background: 'rgba(0,0,0,0.5)', color: 'white', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600 },

  // Broadcaster / Viewer layout
  streamLayout: { display: 'flex', gap: 16, height: 'calc(100vh - 100px)', fontFamily: "'DM Sans', sans-serif" },
  videoArea: { flex: 1, display: 'flex', flexDirection: 'column', background: '#0F172A', borderRadius: 16, overflow: 'hidden', minWidth: 0 },
  streamInfoBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(0,0,0,0.4)', flexShrink: 0 },
  videoContainer: { flex: 1, position: 'relative', overflow: 'hidden' },
  video: { width: '100%', height: '100%', objectFit: 'cover', display: 'block', background: '#0F172A' },
  previewOverlay: { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  bufferingOverlay: { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 },
  controls: { display: 'flex', gap: 10, padding: '12px 16px', background: 'rgba(0,0,0,0.4)', justifyContent: 'center', flexShrink: 0 },
  controlBtn: { padding: '8px 16px', borderRadius: 20, border: 'none', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'background 0.15s' },

  // Chat
  chatPanel: { width: 300, display: 'flex', flexDirection: 'column', background: 'white', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden', flexShrink: 0, minWidth: 0 },
  chatHeader: { padding: '14px 16px', borderBottom: '1px solid #F1F5F9', fontFamily: 'Geist, sans-serif', fontWeight: 700, fontSize: 14, color: '#0F172A', flexShrink: 0 },
  chatMessages: { flex: 1, overflowY: 'auto', padding: '12px 14px' },
  chatInput: { display: 'flex', gap: 8, padding: '10px 12px', borderTop: '1px solid #F1F5F9', flexShrink: 0 },
  chatInputField: { flex: 1, padding: '8px 12px', border: '1.5px solid #E2E8F0', borderRadius: 20, fontSize: 13, color: '#0F172A', background: '#F8FAFC', fontFamily: "'DM Sans', sans-serif" },
  chatSendBtn: { width: 34, height: 34, borderRadius: '50%', border: 'none', background: '#EF4444', color: 'white', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },

  // Modal
  overlay:     { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 },
  modal:       { background: 'white', borderRadius: 20, width: '100%', maxWidth: 520, boxShadow: '0 24px 80px rgba(0,0,0,0.2)', overflow: 'hidden' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid #F1F5F9' },
  modalTitle:  { fontFamily: 'Geist, sans-serif', fontWeight: 700, fontSize: 17, color: '#0F172A', margin: 0 },
  closeBtn:    { background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#94A3B8' },
  label:       { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 5 },
  input:       { width: '100%', padding: '10px 12px', border: '1.5px solid #E2E8F0', borderRadius: 10, fontSize: 14, color: '#0F172A', background: '#F8FAFC', fontFamily: "'DM Sans', sans-serif" },
  select:      { width: '100%', padding: '10px 12px', border: '1.5px solid #E2E8F0', borderRadius: 10, fontSize: 14, color: '#0F172A', background: '#F8FAFC', fontFamily: "'DM Sans', sans-serif" },
  cancelBtn:   { padding: '9px 20px', border: '1.5px solid #E2E8F0', borderRadius: 10, background: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#374151', fontFamily: 'Geist, sans-serif' },
  errorBanner: { background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#DC2626' },
};

export default LivePage;
