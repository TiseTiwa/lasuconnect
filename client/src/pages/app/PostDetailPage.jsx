import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useAuthStore from '../../context/useAuthStore';
import { getPost, toggleLike, getComments, addComment, deleteComment } from '../../services/postsService';

// ── Helpers ────────────────────────────────────────────────
const timeAgo = (date) => {
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
};

// ── Avatar ─────────────────────────────────────────────────
const Avatar = ({ user, size = 40 }) => {
  const initials = user?.fullName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  const colors = ['#1D4ED8','#7C3AED','#DB2777','#059669','#D97706','#DC2626'];
  const color = colors[(user?.username?.charCodeAt(0) || 0) % colors.length];
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: user?.avatarUrl ? 'transparent' : color, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
      {user?.avatarUrl
        ? <img src={user.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span style={{ color: 'white', fontWeight: 700, fontSize: size * 0.35, fontFamily: 'Geist, sans-serif' }}>{initials}</span>
      }
    </div>
  );
};

// ── Role Badge ─────────────────────────────────────────────
const RoleBadge = ({ role }) => {
  const cfg = {
    lecturer:    { label: '👨‍🏫 Lecturer',    color: '#7C3AED', bg: '#F5F3FF' },
    course_rep:  { label: '📋 Course Rep',  color: '#059669', bg: '#F0FDF4' },
    admin:       { label: '⚙️ Admin',        color: '#D97706', bg: '#FFFBEB' },
    super_admin: { label: '🛡️ Super Admin',  color: '#DC2626', bg: '#FEF2F2' },
  }[role];
  if (!cfg) return null;
  return (
    <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 20, padding: '1px 8px', background: cfg.bg, color: cfg.color, fontFamily: 'Geist, sans-serif' }}>
      {cfg.label}
    </span>
  );
};

// ── Media Grid ─────────────────────────────────────────────
const MediaGrid = ({ urls }) => {
  if (!urls?.length) return null;
  const count = urls.length;

  if (count === 1) return (
    <img src={urls[0]} alt="" style={{ width: '100%', maxHeight: 400, objectFit: 'cover', borderRadius: 12, display: 'block', marginBottom: 12 }} />
  );

  const gridStyles = {
    2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, borderRadius: 12, overflow: 'hidden', marginBottom: 12 },
    3: { display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '180px 180px', gap: 3, borderRadius: 12, overflow: 'hidden', marginBottom: 12 },
    4: { display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '180px 180px', gap: 3, borderRadius: 12, overflow: 'hidden', marginBottom: 12 },
  };

  return (
    <div style={gridStyles[Math.min(count, 4)] || gridStyles[4]}>
      {urls.slice(0, 4).map((url, i) => (
        <img key={i} src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', gridColumn: count === 3 && i === 0 ? 'span 1' : undefined, gridRow: count === 3 && i === 0 ? 'span 2' : undefined }} />
      ))}
    </div>
  );
};

// ── Comment Item ───────────────────────────────────────────
const CommentItem = ({ comment, currentUser, postAuthorId, onDelete }) => {
  const navigate = useNavigate();
  const canDelete = comment.author?._id === currentUser?._id ||
                    currentUser?._id === postAuthorId ||
                    ['admin', 'super_admin'].includes(currentUser?.role);

  return (
    <div style={{ display: 'flex', gap: 10, padding: '12px 0', borderBottom: '1px solid #F8FAFC' }}>
      <div onClick={() => navigate(`/profile/${comment.author?.username}`)} style={{ cursor: 'pointer', flexShrink: 0 }}>
        <Avatar user={comment.author} size={34} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ background: '#F8FAFC', borderRadius: '0 12px 12px 12px', padding: '10px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span onClick={() => navigate(`/profile/${comment.author?.username}`)}
              style={{ fontFamily: 'Geist, sans-serif', fontWeight: 700, fontSize: 13, color: '#0F172A', cursor: 'pointer' }}>
              {comment.author?.fullName}
            </span>
            <RoleBadge role={comment.author?.role} />
          </div>
          <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {comment.content}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 5, paddingLeft: 4 }}>
          <span style={{ fontSize: 11, color: '#94A3B8' }}>{timeAgo(comment.createdAt)}</span>
          {canDelete && (
            <button onClick={() => onDelete(comment._id)}
              style={{ fontSize: 11, color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: "'DM Sans', sans-serif" }}>
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Main Post Detail Page ──────────────────────────────────
const PostDetailPage = () => {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const { user }  = useAuthStore();
  const commentInputRef = useRef(null);

  const [post, setPost]             = useState(null);
  const [comments, setComments]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [error, setError]           = useState('');
  const [liked, setLiked]           = useState(false);
  const [likeCount, setLikeCount]   = useState(0);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied]         = useState(false);
  const [commentsPage, setCommentsPage] = useState(1);
  const [hasMoreComments, setHasMoreComments] = useState(false);
  const [loadingMoreComments, setLoadingMoreComments] = useState(false);

  // Load post
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await getPost(id);
        const p = res.data.data.post;
        setPost(p);
        setLiked(p.isLiked);
        setLikeCount(p.likesCount);
      } catch (err) {
        setError(err.response?.data?.message || 'Post not found.');
      }
      setLoading(false);
    };
    load();
  }, [id]);

  // Load comments
  const loadComments = async (page = 1, reset = false) => {
    if (page === 1) setCommentsLoading(true);
    else setLoadingMoreComments(true);
    try {
      const res = await getComments(id, page);
      const { comments: newComments } = res.data.data;
      const { meta } = res.data;
      setComments(p => reset || page === 1 ? newComments : [...p, ...newComments]);
      setHasMoreComments(meta?.hasMore || false);
      setCommentsPage(page);
    } catch (_) {}
    setCommentsLoading(false);
    setLoadingMoreComments(false);
  };

  useEffect(() => {
    if (id) loadComments(1, true);
  }, [id]);

  const handleLike = async () => {
    setLiked(p => !p);
    setLikeCount(p => liked ? p - 1 : p + 1);
    try { await toggleLike(id); }
    catch { setLiked(p => !p); setLikeCount(p => liked ? p + 1 : p - 1); }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await addComment(id, commentText.trim());
      const newComment = res.data.data.comment;
      setComments(p => [newComment, ...p]);
      setPost(p => ({ ...p, commentsCount: (p.commentsCount || 0) + 1 }));
      setCommentText('');
    } catch (_) {}
    setSubmitting(false);
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await deleteComment(id, commentId);
      setComments(p => p.filter(c => c._id !== commentId));
      setPost(p => ({ ...p, commentsCount: Math.max(0, (p.commentsCount || 1) - 1) }));
    } catch (_) {}
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/post/${id}`;
    if (navigator.share) {
      try { await navigator.share({ title: post?.content?.slice(0, 60), url }); return; }
      catch (_) {}
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Loading ────────────────────────────────────────────
  if (loading) return (
    <div style={{ paddingBottom: 80, fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
      <button onClick={() => navigate(-1)} style={s.backBtn}>← Back</button>
      <div style={s.card}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#E2E8F0', animation: 'pulse 1.5s ease infinite' }} />
          <div style={{ flex: 1 }}>
            <div style={{ height: 14, background: '#E2E8F0', borderRadius: 6, width: '35%', marginBottom: 8, animation: 'pulse 1.5s ease infinite' }} />
            <div style={{ height: 12, background: '#E2E8F0', borderRadius: 6, width: '20%', animation: 'pulse 1.5s ease infinite' }} />
          </div>
        </div>
        <div style={{ height: 16, background: '#E2E8F0', borderRadius: 6, marginBottom: 8, animation: 'pulse 1.5s ease infinite' }} />
        <div style={{ height: 16, background: '#E2E8F0', borderRadius: 6, width: '80%', animation: 'pulse 1.5s ease infinite' }} />
      </div>
    </div>
  );

  // ── Error ──────────────────────────────────────────────
  if (error) return (
    <div style={{ paddingBottom: 80, fontFamily: "'DM Sans', sans-serif", textAlign: 'center', padding: '80px 20px' }}>
      <span style={{ fontSize: 48, display: 'block', marginBottom: 16 }}>🔍</span>
      <h3 style={{ fontFamily: 'Geist, sans-serif', fontWeight: 700, fontSize: 20, color: '#0F172A', marginBottom: 8 }}>Post not found</h3>
      <p style={{ color: '#64748B', fontSize: 14, marginBottom: 20 }}>{error}</p>
      <button onClick={() => navigate(-1)} style={s.primaryBtn}>← Go Back</button>
    </div>
  );

  const isAuthor = post?.author?._id === user?._id;

  return (
    <div style={{ paddingBottom: 80, fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        textarea:focus, input:focus { outline: none; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>

      {/* Back button */}
      <button onClick={() => navigate(-1)} style={s.backBtn}>← Back</button>

      {/* Post card */}
      <div style={{ ...s.card, animation: 'fadeUp 0.3s ease forwards' }}>

        {/* Author row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div onClick={() => navigate(`/profile/${post.author?.username}`)} style={{ cursor: 'pointer' }}>
            <Avatar user={post.author} size={46} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span onClick={() => navigate(`/profile/${post.author?.username}`)}
                style={{ fontFamily: 'Geist, sans-serif', fontWeight: 700, fontSize: 15, color: '#0F172A', cursor: 'pointer' }}>
                {post.author?.fullName}
              </span>
              {post.author?.isVerified && (
                <span style={{ background: '#2563EB', color: 'white', borderRadius: '50%', width: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>✓</span>
              )}
              <RoleBadge role={post.author?.role} />
            </div>
            <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>
              @{post.author?.username} · {post.author?.department} · {timeAgo(post.createdAt)}
            </div>
          </div>

          {/* Feed type badge */}
          <span style={{ fontSize: 11, background: post.feedType === 'academic' ? '#EFF6FF' : '#F0FDF4', color: post.feedType === 'academic' ? '#2563EB' : '#16A34A', borderRadius: 20, padding: '3px 10px', fontWeight: 700, flexShrink: 0 }}>
            {post.feedType === 'academic' ? '📚 Academic' : '🌐 Social'}
          </span>
        </div>

        {/* Post content */}
        <p style={{ fontSize: 16, color: '#1E293B', lineHeight: 1.75, marginBottom: 14, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {post.content}
        </p>

        {/* Media */}
        <MediaGrid urls={post.mediaUrls} />

        {/* Tags */}
        {post.tags?.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            {post.tags.map(tag => (
              <span key={tag} style={{ fontSize: 13, color: '#2563EB', fontWeight: 600 }}>#{tag}</span>
            ))}
          </div>
        )}

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 16, paddingBottom: 12, borderBottom: '1px solid #F1F5F9', fontSize: 13, color: '#94A3B8' }}>
          <span>{likeCount} {likeCount === 1 ? 'like' : 'likes'}</span>
          <span>{post.commentsCount || 0} {post.commentsCount === 1 ? 'comment' : 'comments'}</span>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 4, padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
          <button onClick={handleLike}
            style={{ ...s.actionBtn, color: liked ? '#EF4444' : '#64748B', background: liked ? '#FEF2F2' : 'transparent', flex: 1 }}>
            {liked ? '❤️' : '🤍'} {liked ? 'Liked' : 'Like'}
          </button>
          <button onClick={() => commentInputRef.current?.focus()}
            style={{ ...s.actionBtn, color: '#64748B', flex: 1 }}>
            💬 Comment
          </button>
          <button onClick={handleShare}
            style={{ ...s.actionBtn, color: copied ? '#059669' : '#64748B', flex: 1 }}>
            {copied ? '✅ Copied!' : '🔗 Share'}
          </button>
        </div>

        {/* Comment composer */}
        <form onSubmit={handleComment} style={{ display: 'flex', gap: 10, paddingTop: 14, alignItems: 'flex-start' }}>
          <Avatar user={user} size={34} />
          <div style={{ flex: 1 }}>
            <textarea
              ref={commentInputRef}
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleComment(e); } }}
              placeholder="Write a comment..."
              rows={1}
              style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #E2E8F0', borderRadius: 20, fontSize: 14, color: '#0F172A', background: '#F8FAFC', fontFamily: "'DM Sans', sans-serif", resize: 'none', lineHeight: 1.5 }}
            />
            {commentText.trim() && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
                <button type="submit" disabled={submitting}
                  style={{ ...s.primaryBtn, padding: '6px 18px', fontSize: 13, opacity: submitting ? 0.7 : 1 }}>
                  {submitting ? 'Posting...' : 'Post'}
                </button>
              </div>
            )}
          </div>
        </form>
      </div>

      {/* Comments section */}
      <div style={s.card}>
        <h3 style={{ fontFamily: 'Geist, sans-serif', fontWeight: 700, fontSize: 16, color: '#0F172A', marginBottom: 4 }}>
          Comments {post.commentsCount > 0 && `(${post.commentsCount})`}
        </h3>

        {commentsLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 12 }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ display: 'flex', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#E2E8F0', flexShrink: 0, animation: 'pulse 1.5s ease infinite' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ height: 60, background: '#F1F5F9', borderRadius: '0 12px 12px 12px', animation: 'pulse 1.5s ease infinite' }} />
                </div>
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#94A3B8', fontSize: 14 }}>
            No comments yet. Be the first to comment!
          </div>
        ) : (
          <>
            {comments.map(comment => (
              <CommentItem
                key={comment._id}
                comment={comment}
                currentUser={user}
                postAuthorId={post.author?._id}
                onDelete={handleDeleteComment}
              />
            ))}

            {hasMoreComments && (
              <button onClick={() => loadComments(commentsPage + 1)} disabled={loadingMoreComments}
                style={{ width: '100%', padding: '10px', border: '1.5px solid #E2E8F0', borderRadius: 10, background: 'white', fontSize: 13, fontWeight: 600, color: '#2563EB', cursor: 'pointer', marginTop: 8, fontFamily: "'DM Sans', sans-serif" }}>
                {loadingMoreComments ? 'Loading...' : 'Load more comments'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ─── Styles ───────────────────────────────────────────────
const s = {
  backBtn:    { background: 'none', border: 'none', color: '#2563EB', fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: '0 0 14px', fontFamily: "'DM Sans', sans-serif", display: 'block' },
  card:       { background: 'white', borderRadius: 16, padding: '20px', border: '1px solid #E2E8F0', marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
  actionBtn:  { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 12px', borderRadius: 8, border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'all 0.15s' },
  primaryBtn: { padding: '9px 24px', border: 'none', borderRadius: 10, background: 'linear-gradient(135deg, #1D4ED8, #3B82F6)', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Geist, sans-serif', boxShadow: '0 3px 10px rgba(37,99,235,0.3)' },
};

export default PostDetailPage;
