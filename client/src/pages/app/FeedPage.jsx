import useUpload from "../../hooks/useUpload";
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom"; // ← Fix 1: added import
import useAuthStore from "../../context/useAuthStore";
import {
  getFeed,
  createPost,
  toggleLike,
  getComments,
  addComment,
} from "../../services/postsService";

// ── Time formatter ─────────────────────────────────────────
const timeAgo = (date) => {
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
};

// ── Avatar ─────────────────────────────────────────────────
const Avatar = ({ user, size = 40 }) => {
  const initials =
    user?.fullName?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";
  const colors = ["#1D4ED8", "#7C3AED", "#DB2777", "#059669", "#D97706", "#DC2626"];
  const color = colors[(user?.username?.charCodeAt(0) || 0) % colors.length];
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: user?.avatarUrl ? "transparent" : color, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
      {user?.avatarUrl
        ? <img src={user.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : <span style={{ color: "white", fontWeight: 700, fontSize: size * 0.35, fontFamily: "Geist, sans-serif" }}>{initials}</span>
      }
    </div>
  );
};

// ── Comment component ──────────────────────────────────────
const CommentItem = ({ comment }) => (
  <div style={s.commentItem}>
    <Avatar user={comment.author} size={30} />
    <div style={s.commentBubble}>
      <span style={s.commentAuthor}>{comment.author?.fullName}</span>
      <span style={s.commentText}>{comment.content}</span>
      <span style={s.commentTime}>{timeAgo(comment.createdAt)}</span>
    </div>
  </div>
);

// ── Post Card ──────────────────────────────────────────────
const PostCard = ({ post, currentUserId }) => {
  const navigate = useNavigate(); // ← Fix 1: declared inside PostCard

  const [liked, setLiked]               = useState(post.isLiked);
  const [likeCount, setLikeCount]       = useState(post.likesCount);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments]         = useState([]);
  const [commentText, setCommentText]   = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [submitting, setSubmitting]     = useState(false);
  const [copied, setCopied]             = useState(false);

  const handleLike = async () => {
    setLiked((p) => !p);
    setLikeCount((p) => (liked ? p - 1 : p + 1));
    try { await toggleLike(post._id); }
    catch { setLiked((p) => !p); setLikeCount((p) => (liked ? p + 1 : p - 1)); }
  };

  const handleToggleComments = async () => {
    setShowComments((p) => !p);
    if (!showComments && comments.length === 0) {
      setLoadingComments(true);
      try {
        const res = await getComments(post._id);
        setComments(res.data.data.comments);
      } catch (_) {}
      setLoadingComments(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await addComment(post._id, commentText.trim());
      setComments((p) => [...p, res.data.data.comment]);
      setCommentText("");
    } catch (_) {}
    setSubmitting(false);
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/post/${post._id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Fix 4: removed shareCount — backend doesn't track it yet
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${post.author?.fullName} on LASUConnect`,
          text: post.content?.slice(0, 100) + "...",
          url: `${window.location.origin}/post/${post._id}`,
        });
        return;
      } catch (_) {}
    }
    handleCopyLink();
  };

  // ── Media grid layout (Instagram style) ─────────────────
  const renderMedia = () => {
    if (!post.mediaUrls?.length) return null;
    const urls = post.mediaUrls;
    const count = urls.length;
    const gridStyle = {
      display: "grid",
      gap: 3,
      marginBottom: 12,
      borderRadius: 12,
      overflow: "hidden",
      gridTemplateColumns: count === 1 ? "1fr" : "1fr 1fr",
      gridTemplateRows:
        count === 1 ? "auto"
        : count === 2 ? "200px"
        : "160px 160px",
    };
    return (
      <div style={gridStyle}>
        {urls.map((url, i) => (
          <div key={i} style={{ overflow: "hidden", gridRow: count === 3 && i === 0 ? "span 2" : undefined, height: count === 1 ? "360px" : "100%" }}>
            <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={s.postCard}>
      {post.isPinned && <div style={s.pinnedBadge}>📌 Pinned</div>}

      <div style={s.postHeader}>
        {/* Fix 3: avatar navigates to profile */}
        <div onClick={() => navigate(`/profile/${post.author?.username}`)} style={{ cursor: "pointer" }}>
          <Avatar user={post.author} size={42} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={s.postAuthorRow}>
            {/* Fix 3: author name navigates to profile */}
            <span
              onClick={() => navigate(`/profile/${post.author?.username}`)}
              style={{ ...s.postAuthorName, cursor: "pointer" }}
            >
              {post.author?.fullName}
            </span>
            {post.feedType === "academic" && (
              <span style={s.academicBadge}>📚 Academic</span>
            )}
          </div>
          <div style={s.postMeta}>
            @{post.author?.username} · {post.author?.department} · {timeAgo(post.createdAt)}
          </div>
        </div>
      </div>

      {/* Fix 2: content navigates to post detail */}
      {post.content && (
        <p
          onClick={() => navigate(`/post/${post._id}`)}
          style={{ ...s.postContent, cursor: "pointer" }}
        >
          {post.content}
        </p>
      )}

      {/* Fix 2: media also navigates to post detail */}
      {post.mediaUrls?.length > 0 && (
        <div onClick={() => navigate(`/post/${post._id}`)} style={{ cursor: "pointer" }}>
          {renderMedia()}
        </div>
      )}

      {post.tags?.length > 0 && (
        <div style={s.tagRow}>
          {post.tags.map((tag) => (
            <span key={tag} style={s.tag}>#{tag}</span>
          ))}
        </div>
      )}

      <div style={s.postActions}>
        <button onClick={handleLike}
          style={{ ...s.actionBtn, color: liked ? "#EF4444" : "#64748B", background: liked ? "#FEF2F2" : "transparent" }}>
          {liked ? "❤️" : "🤍"} <span>{likeCount}</span>
        </button>
        <button onClick={handleToggleComments} style={s.actionBtn}>
          💬 <span>{post.commentsCount}</span>
        </button>
        {/* Fix 4: no share count shown */}
        <button onClick={handleShare} style={s.actionBtn}>
          🔁 Share
        </button>
        <button onClick={handleCopyLink}
          style={{ ...s.actionBtn, marginLeft: "auto", color: copied ? "#10B981" : "#64748B" }}>
          {copied ? "✅" : "🔗"}
        </button>
      </div>

      {showComments && (
        <div style={s.commentsSection}>
          {loadingComments && <div style={s.loadingText}>Loading comments...</div>}
          {comments.map((c) => <CommentItem key={c._id} comment={c} />)}
          <form onSubmit={handleAddComment} style={s.commentForm}>
            <input
              placeholder="Write a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              style={s.commentInput}
            />
            <button type="submit" disabled={!commentText.trim() || submitting} style={s.commentSubmit}>
              {submitting ? "..." : "→"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

// ── Post Composer ──────────────────────────────────────────
const PostComposer = ({ user, onPost }) => {
  const [text, setText]             = useState("");
  const [feedType, setFeedType]     = useState("social");
  const [expanded, setExpanded]     = useState(false);
  const [error, setError]           = useState("");
  const [previews, setPreviews]     = useState([]);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [posting, setPosting]       = useState(false);
  const fileInputRef                = useRef(null);
  const { upload, uploading, progress } = useUpload();

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const combined = [...mediaFiles, ...files].slice(0, 4);
    setMediaFiles(combined);
    setPreviews(combined.map((f) => URL.createObjectURL(f)));
    e.target.value = "";
  };

  const removeImage = (index) => {
    setMediaFiles((p) => p.filter((_, i) => i !== index));
    setPreviews((p) => p.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if ((!text.trim() && mediaFiles.length === 0) || posting) return;
    setPosting(true); setError("");
    try {
      let mediaUrls = [], mediaType = "text";
      if (mediaFiles.length > 0) {
        const uploadData = await upload(mediaFiles, "post");
        mediaUrls = uploadData.mediaUrls;
        mediaType = uploadData.mediaType;
      }
      const res = await createPost({ content: text.trim(), feedType, mediaUrls, mediaType });
      setText(""); setMediaFiles([]); setPreviews([]); setExpanded(false);
      onPost(res.data.data.post);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to post. Try again.");
    }
    setPosting(false);
  };

  const isSubmitting = posting || uploading;
  const canPost = (text.trim() || mediaFiles.length > 0) && !isSubmitting;
  const count = previews.length;

  return (
    <div style={cs.composer}>
      <input ref={fileInputRef} type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,video/mp4"
        multiple onChange={handleFileSelect} style={{ display: "none" }} />

      <div style={cs.composerTop}>
        <Avatar user={user} size={40} />
        <div style={{ flex: 1 }}>
          <textarea
            placeholder={`What's on your mind, ${user?.fullName?.split(" ")[0]}? 🎓`}
            value={text}
            onChange={(e) => { setText(e.target.value); setError(""); }}
            onFocus={() => setExpanded(true)}
            style={{ ...cs.composerInput, height: expanded ? "90px" : "44px" }}
          />
        </div>
      </div>

      {/* Instagram-style preview grid */}
      {previews.length > 0 && (
        <div style={{ display: "grid", gap: 3, marginTop: 12, borderRadius: 12, overflow: "hidden", gridTemplateColumns: count === 1 ? "1fr" : "1fr 1fr", gridTemplateRows: count === 1 ? "auto" : count === 2 ? "180px" : "140px 140px" }}>
          {previews.map((url, i) => (
            <div key={i} style={{ position: "relative", overflow: "hidden", gridRow: count === 3 && i === 0 ? "span 2" : undefined, height: count === 1 ? "280px" : "100%" }}>
              <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              <button onClick={() => removeImage(i)} style={cs.removeBtn}>✕</button>
            </div>
          ))}
          {count < 4 && (
            <div onClick={() => fileInputRef.current?.click()}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#F1F5F9", cursor: "pointer", color: "#94A3B8", gap: 4, height: count === 0 ? 180 : "100%", minHeight: 80 }}>
              <span style={{ fontSize: 24 }}>+</span>
              <span style={{ fontSize: 11, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>Add more</span>
            </div>
          )}
        </div>
      )}

      {uploading && (
        <div style={cs.progressBar}>
          <div style={{ ...cs.progressFill, width: `${progress}%` }} />
          <span style={cs.progressText}>Uploading... {progress}%</span>
        </div>
      )}

      {error && <div style={cs.composerError}>⚠️ {error}</div>}

      {expanded && (
        <div style={cs.composerActions}>
          <div style={cs.composerLeft}>
            <button onClick={() => fileInputRef.current?.click()} disabled={mediaFiles.length >= 4}
              style={{ ...cs.composerBtn, opacity: mediaFiles.length >= 4 ? 0.5 : 1 }}>
              📷 {mediaFiles.length > 0 ? `${mediaFiles.length}/4` : "Photo"}
            </button>
            <button style={cs.composerBtn}>🎬 Video</button>
            <button style={cs.composerBtn}>😂 Meme</button>
          </div>
          <div style={cs.composerRight}>
            <select value={feedType} onChange={(e) => setFeedType(e.target.value)} style={cs.feedSelect}>
              <option value="social">🌐 Social</option>
              <option value="academic">🎓 Academic</option>
            </select>
            <button onClick={handleSubmit} disabled={!canPost}
              style={{ ...cs.postBtn, opacity: canPost ? 1 : 0.5 }}>
              {isSubmitting ? (uploading ? `${progress}%` : "Posting...") : "Post"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Composer styles ────────────────────────────────────────
const cs = {
  composer:       { background: "white", borderRadius: 16, padding: 16, border: "1px solid #E2E8F0", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" },
  composerTop:    { display: "flex", gap: 12, alignItems: "flex-start" },
  composerInput:  { width: "100%", border: "1.5px solid #E2E8F0", borderRadius: 12, padding: "10px 14px", fontSize: 14, color: "#0F172A", background: "#F8FAFC", transition: "height 0.2s", lineHeight: 1.5, fontFamily: "'DM Sans', sans-serif", resize: "none" },
  removeBtn:      { position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: "50%", background: "rgba(0,0,0,0.65)", border: "none", color: "white", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 },
  progressBar:    { position: "relative", height: 6, background: "#E2E8F0", borderRadius: 4, marginTop: 10, overflow: "hidden" },
  progressFill:   { height: "100%", background: "linear-gradient(90deg, #1D4ED8, #3B82F6)", borderRadius: 4, transition: "width 0.2s" },
  progressText:   { fontSize: 11, color: "#94A3B8", marginTop: 4, display: "block", fontFamily: "'DM Sans', sans-serif" },
  composerError:  { background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#DC2626", marginTop: 10 },
  composerActions: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, paddingTop: 12, borderTop: "1px solid #F1F5F9", flexWrap: "wrap", gap: 8 },
  composerLeft:   { display: "flex", gap: 6 },
  composerRight:  { display: "flex", gap: 8, alignItems: "center" },
  composerBtn:    { padding: "6px 12px", border: "1.5px solid #E2E8F0", borderRadius: 8, background: "white", fontSize: 13, fontWeight: 600, color: "#475569", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  feedSelect:     { padding: "6px 10px", border: "1.5px solid #E2E8F0", borderRadius: 8, background: "white", fontSize: 13, color: "#475569", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  postBtn:        { padding: "7px 20px", background: "linear-gradient(135deg, #1D4ED8, #3B82F6)", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "Geist, sans-serif", transition: "opacity 0.15s" },
};

// ── Main Feed Page ─────────────────────────────────────────
const FeedPage = () => {
  const { user }  = useAuthStore();
  const [posts, setPosts]             = useState([]);
  const [feedType, setFeedType]       = useState("all");
  const [page, setPage]               = useState(1);
  const [hasMore, setHasMore]         = useState(true);
  const [loading, setLoading]         = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError]             = useState("");
  const loaderRef = useRef(null);

  const loadPosts = useCallback(async (pageNum = 1, type = feedType, reset = false) => {
    if (pageNum === 1) setLoading(true); else setLoadingMore(true);
    setError("");
    try {
      const res = await getFeed({ feedType: type === "all" ? undefined : type, page: pageNum, limit: 15 });
      const { posts: newPosts } = res.data.data;
      const { meta } = res.data;
      setPosts((p) => reset || pageNum === 1 ? newPosts : [...p, ...newPosts]);
      setHasMore(meta.hasMore);
      setPage(pageNum);
    } catch (err) {
      setError("Failed to load posts. Please try again.");
    }
    setLoading(false);
    setLoadingMore(false);
  }, [feedType]);

  useEffect(() => { loadPosts(1, feedType, true); }, [feedType]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting && hasMore && !loadingMore) loadPosts(page + 1); },
      { threshold: 0.1 }
    );
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, page, loadPosts]);

  const handleNewPost = (post) => setPosts((p) => [post, ...p]);

  return (
    <div style={s.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        textarea { resize: none; }
        textarea:focus, input:focus, select:focus { outline: none; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .post-item { animation: slideUp 0.25s ease forwards; }
      `}</style>

      <div style={s.pageHeader}>
        <h1 style={s.pageTitle}>Feed</h1>
        <span style={s.pageSubtitle}>What's happening on campus 🔥</span>
      </div>

      <PostComposer user={user} onPost={handleNewPost} />

      <div style={s.toggle}>
        {[["all", "🌐 All"], ["social", "😄 Social"], ["academic", "🎓 Academic"]].map(([val, label]) => (
          <button key={val} onClick={() => setFeedType(val)}
            style={{ ...s.toggleBtn, ...(feedType === val ? s.toggleActive : {}) }}>
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div style={s.errorBox}>
          ⚠️ {error}
          <button onClick={() => loadPosts(1, feedType, true)} style={s.retryBtn}>Retry</button>
        </div>
      )}

      {loading && (
        <div style={s.posts}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ ...s.postCard, padding: "20px" }}>
              <div style={s.skeletonHeader}>
                <div style={{ ...s.skeletonCircle, animation: "pulse 1.5s ease infinite" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ ...s.skeletonLine, width: "40%", animation: "pulse 1.5s ease infinite" }} />
                  <div style={{ ...s.skeletonLine, width: "25%", marginTop: "6px", animation: "pulse 1.5s ease infinite" }} />
                </div>
              </div>
              <div style={{ ...s.skeletonLine, width: "100%", marginTop: "14px", animation: "pulse 1.5s ease infinite" }} />
              <div style={{ ...s.skeletonLine, width: "80%", marginTop: "8px", animation: "pulse 1.5s ease infinite" }} />
            </div>
          ))}
        </div>
      )}

      {!loading && (
        <div style={s.posts}>
          {posts.length === 0 ? (
            <div style={s.emptyState}>
              <div style={s.emptyIcon}>📭</div>
              <h3 style={s.emptyTitle}>No posts yet</h3>
              <p style={s.emptyText}>
                {feedType === "academic"
                  ? "No academic posts yet. Share your study tips or course notes!"
                  : "Be the first to post! Share what's happening on campus."}
              </p>
            </div>
          ) : (
            posts.map((post, i) => (
              <div key={post._id} className="post-item" style={{ animationDelay: `${Math.min(i, 5) * 0.06}s` }}>
                <PostCard post={post} currentUserId={user?._id} />
              </div>
            ))
          )}
          <div ref={loaderRef} style={{ height: "20px" }} />
          {loadingMore && (
            <div style={s.loadMoreSpinner}><div style={s.spinner} /></div>
          )}
          {!hasMore && posts.length > 0 && (
            <div style={s.endText}>You're all caught up! 🎉</div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Styles ────────────────────────────────────────────────
const s = {
  page:           { paddingBottom: "80px", fontFamily: "'DM Sans', sans-serif" },
  pageHeader:     { marginBottom: "20px" },
  pageTitle:      { fontFamily: "'Geist', sans-serif", fontWeight: 800, fontSize: "26px", color: "#0F172A", lineHeight: 1.1 },
  pageSubtitle:   { fontSize: "14px", color: "#64748B", marginTop: "4px", display: "block" },
  toggle:         { display: "flex", gap: "6px", marginBottom: "16px", background: "white", padding: "6px", borderRadius: "12px", border: "1px solid #E2E8F0" },
  toggleBtn:      { flex: 1, padding: "8px", borderRadius: "8px", border: "none", background: "transparent", fontSize: "13px", fontWeight: 600, color: "#64748B", cursor: "pointer", transition: "all 0.15s", fontFamily: "'DM Sans', sans-serif" },
  toggleActive:   { background: "#EFF6FF", color: "#2563EB" },
  posts:          { display: "flex", flexDirection: "column", gap: "12px" },
  postCard:       { background: "white", borderRadius: "16px", padding: "16px", border: "1px solid #E2E8F0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" },
  pinnedBadge:    { fontSize: "11px", color: "#D97706", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: "20px", padding: "2px 10px", display: "inline-block", marginBottom: "10px", fontWeight: 600 },
  postHeader:     { display: "flex", gap: "10px", alignItems: "flex-start", marginBottom: "10px" },
  postAuthorRow:  { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" },
  postAuthorName: { fontFamily: "'Geist', sans-serif", fontWeight: 700, fontSize: "14px", color: "#0F172A" },
  academicBadge:  { fontSize: "11px", background: "#EFF6FF", color: "#2563EB", padding: "2px 8px", borderRadius: "20px", fontWeight: 600 },
  postMeta:       { fontSize: "12px", color: "#94A3B8", marginTop: "2px" },
  postContent:    { fontSize: "14.5px", color: "#1E293B", lineHeight: 1.65, marginBottom: "10px", whiteSpace: "pre-wrap" },
  tagRow:         { display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "10px" },
  tag:            { fontSize: "12px", color: "#2563EB", background: "#EFF6FF", padding: "2px 8px", borderRadius: "20px", fontWeight: 600, cursor: "pointer" },
  postActions:    { display: "flex", gap: "4px", paddingTop: "10px", borderTop: "1px solid #F1F5F9" },
  actionBtn:      { display: "flex", alignItems: "center", gap: "5px", padding: "6px 10px", borderRadius: "8px", border: "none", background: "transparent", fontSize: "13px", fontWeight: 600, color: "#64748B", cursor: "pointer", transition: "all 0.15s", fontFamily: "'DM Sans', sans-serif" },
  commentsSection:{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #F1F5F9", display: "flex", flexDirection: "column", gap: "10px" },
  commentItem:    { display: "flex", gap: "8px", alignItems: "flex-start" },
  commentBubble:  { background: "#F8FAFC", borderRadius: "12px", padding: "8px 12px", flex: 1, display: "flex", flexDirection: "column", gap: "2px" },
  commentAuthor:  { fontFamily: "'Geist', sans-serif", fontWeight: 700, fontSize: "12px", color: "#0F172A" },
  commentText:    { fontSize: "13px", color: "#374151", lineHeight: 1.5 },
  commentTime:    { fontSize: "11px", color: "#94A3B8" },
  commentForm:    { display: "flex", gap: "8px", alignItems: "center" },
  commentInput:   { flex: 1, padding: "8px 14px", border: "1.5px solid #E2E8F0", borderRadius: "20px", fontSize: "13px", background: "#F8FAFC", color: "#0F172A", fontFamily: "'DM Sans', sans-serif" },
  commentSubmit:  { width: "34px", height: "34px", borderRadius: "50%", background: "#2563EB", color: "white", border: "none", fontSize: "16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  loadingText:    { fontSize: "13px", color: "#94A3B8", textAlign: "center", padding: "8px" },
  errorBox:       { background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "12px", padding: "12px 16px", fontSize: "13px", color: "#DC2626", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" },
  retryBtn:       { background: "#DC2626", color: "white", border: "none", borderRadius: "6px", padding: "4px 12px", fontSize: "12px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  emptyState:     { textAlign: "center", padding: "60px 20px" },
  emptyIcon:      { fontSize: "48px", marginBottom: "16px" },
  emptyTitle:     { fontFamily: "'Geist', sans-serif", fontWeight: 700, fontSize: "18px", color: "#0F172A", marginBottom: "8px" },
  emptyText:      { fontSize: "14px", color: "#64748B", lineHeight: 1.6 },
  skeletonHeader: { display: "flex", gap: "12px", alignItems: "center" },
  skeletonCircle: { width: "42px", height: "42px", borderRadius: "50%", background: "#E2E8F0", flexShrink: 0 },
  skeletonLine:   { height: "14px", background: "#E2E8F0", borderRadius: "6px" },
  loadMoreSpinner:{ display: "flex", justifyContent: "center", padding: "20px" },
  spinner:        { width: "24px", height: "24px", border: "3px solid #E2E8F0", borderTopColor: "#2563EB", borderRadius: "50%", animation: "spin 0.7s linear infinite" },
  endText:        { textAlign: "center", fontSize: "13px", color: "#94A3B8", padding: "20px", fontWeight: 600 },
};

export default FeedPage;
