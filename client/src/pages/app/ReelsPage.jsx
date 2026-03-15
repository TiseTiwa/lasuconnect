import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../../context/useAuthStore";
import {
  getReels,
  getTrending,
  toggleLike,
  getComments,
  addComment,
  uploadReel,
  deleteReel,
} from "../../services/reelsService";
import { toggleFollow } from "../../services/usersService";

// ── Time formatter ─────────────────────────────────────────
const timeAgo = (date) => {
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
};

// ── Avatar ─────────────────────────────────────────────────
const Avatar = ({ user, size = 36 }) => {
  const initials =
    user?.fullName
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";
  const colors = [
    "#1D4ED8",
    "#7C3AED",
    "#DB2777",
    "#059669",
    "#D97706",
    "#DC2626",
  ];
  const color = colors[(user?.username?.charCodeAt(0) || 0) % colors.length];
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: user?.avatarUrl ? "transparent" : color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        flexShrink: 0,
        border: "2px solid rgba(255,255,255,0.8)",
      }}
    >
      {user?.avatarUrl ? (
        <img
          src={user.avatarUrl}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <span
          style={{
            color: "white",
            fontWeight: 700,
            fontSize: size * 0.35,
            fontFamily: "Geist, sans-serif",
          }}
        >
          {initials}
        </span>
      )}
    </div>
  );
};

// ── Spinning Disc Sound Animation ─────────────────────────
const SpinningDisc = ({ sound, isPlaying }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: "50%",
        background: "linear-gradient(135deg, #1D4ED8, #7C3AED)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: isPlaying ? "spin 3s linear infinite" : "none",
        flexShrink: 0,
        boxShadow: "0 0 8px rgba(99,102,241,0.6)",
      }}
    >
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: "white",
        }}
      />
    </div>
    <span
      style={{
        color: "rgba(255,255,255,0.9)",
        fontSize: 12,
        maxWidth: 160,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    >
      🎵 {sound || "Original Audio"}
    </span>
  </div>
);

// ── Heart Burst Animation ──────────────────────────────────
const HeartBurst = ({ x, y, onDone }) => {
  useEffect(() => {
    const t = setTimeout(onDone, 900);
    return () => clearTimeout(t);
  }, []);
  return (
    <div
      style={{
        position: "absolute",
        left: x - 50,
        top: y - 50,
        width: 100,
        height: 100,
        pointerEvents: "none",
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span
        style={{ fontSize: 80, animation: "heartBurst 0.9s ease forwards" }}
      >
        ❤️
      </span>
    </div>
  );
};

// ── Video Progress Bar ─────────────────────────────────────
const VideoProgress = ({ videoRef }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const update = () => {
      if (video.duration)
        setProgress((video.currentTime / video.duration) * 100);
    };
    video.addEventListener("timeupdate", update);
    return () => video.removeEventListener("timeupdate", update);
  }, [videoRef]);

  const handleSeek = (e) => {
    const video = videoRef.current;
    if (!video) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    video.currentTime = ratio * video.duration;
  };

  return (
    <div
      onClick={handleSeek}
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 3,
        background: "rgba(255,255,255,0.25)",
        cursor: "pointer",
        zIndex: 10,
      }}
    >
      <div
        style={{
          height: "100%",
          background: "white",
          width: `${progress}%`,
          transition: "width 0.1s linear",
          borderRadius: 2,
        }}
      />
    </div>
  );
};

// ── Buffering Spinner ──────────────────────────────────────
const BufferingSpinner = () => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "rgba(0,0,0,0.3)",
      zIndex: 20,
      pointerEvents: "none",
    }}
  >
    <div
      style={{
        width: 44,
        height: 44,
        border: "3px solid rgba(255,255,255,0.3)",
        borderTopColor: "white",
        borderRadius: "50%",
        animation: "spin 0.7s linear infinite",
      }}
    />
  </div>
);

// ── Comments Drawer ────────────────────────────────────────
const CommentsDrawer = ({ reelId, commentsCount, onClose }) => {
  const { user } = useAuthStore();
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getComments(reelId)
      .then((res) => setComments(res.data.data.comments))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [reelId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await addComment(reelId, text.trim());
      setComments((p) => [...p, res.data.data.comment]);
      setText("");
    } catch (_) {}
    setSubmitting(false);
  };

  return (
    <div
      style={s.drawerOverlay}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={s.drawer}>
        <div style={s.drawerHandle} />
        <div style={s.drawerHeader}>
          <span style={s.drawerTitle}>{commentsCount} Comments</span>
          <button onClick={onClose} style={s.drawerClose}>
            ✕
          </button>
        </div>
        <div style={s.commentsList}>
          {loading ? (
            <div style={s.drawerEmpty}>Loading comments...</div>
          ) : comments.length === 0 ? (
            <div style={s.drawerEmpty}>No comments yet. Be the first!</div>
          ) : (
            comments.map((c) => (
              <div key={c._id} style={s.commentRow}>
                <Avatar user={c.author} size={32} />
                <div style={s.commentContent}>
                  <div style={s.commentName}>{c.author?.fullName}</div>
                  <div style={s.commentText}>{c.content}</div>
                  <div style={s.commentMeta}>{timeAgo(c.createdAt)}</div>
                </div>
              </div>
            ))
          )}
        </div>
        <form onSubmit={handleSubmit} style={s.commentForm}>
          <Avatar user={user} size={32} />
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a comment..."
            style={s.commentInput}
          />
          <button
            type="submit"
            disabled={!text.trim() || submitting}
            style={s.commentSend}
          >
            {submitting ? "..." : "→"}
          </button>
        </form>
      </div>
    </div>
  );
};

// ── Upload Modal ───────────────────────────────────────────
const UploadModal = ({ onClose, onUploaded }) => {
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState("");
  const [caption, setCaption] = useState("");
  const [tags, setTags] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) {
      setError("Video must be under 100MB.");
      return;
    }
    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
    setError("");
  };

  const handleUpload = async () => {
    if (!videoFile || uploading) return;
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("video", videoFile);
      formData.append("caption", caption.trim());
      formData.append("tags", tags.trim());
      const res = await uploadReel(formData);
      onUploaded(res.data.data.reel);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Upload failed. Try again.");
    }
    setUploading(false);
  };

  return (
    <div
      style={s.drawerOverlay}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ ...s.drawer, maxHeight: "92vh" }}>
        <div style={s.drawerHandle} />
        <div style={s.drawerHeader}>
          <span style={s.drawerTitle}>Upload Reel</span>
          <button onClick={onClose} style={s.drawerClose}>
            ✕
          </button>
        </div>
        <div style={{ padding: "0 16px 24px", overflowY: "auto" }}>
          {!videoPreview ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              style={s.videoPicker}
            >
              <span style={{ fontSize: 44 }}>🎬</span>
              <span style={s.videoPickerText}>Tap to select a video</span>
              <span style={s.videoPickerSub}>MP4, MOV, WEBM · Max 100MB</span>
            </div>
          ) : (
            <div style={s.videoPreviewWrap}>
              <video src={videoPreview} controls style={s.videoPreview} />
              <button
                onClick={() => {
                  setVideoFile(null);
                  setVideoPreview("");
                }}
                style={s.changeVideoBtn}
              >
                Change video
              </button>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/quicktime,video/webm"
            onChange={handleFileSelect}
            style={{ display: "none" }}
          />

          <div style={s.uploadField}>
            <label style={s.uploadLabel}>
              Caption{" "}
              <span style={{ color: "#94A3B8", fontWeight: 400 }}>
                ({300 - caption.length} left)
              </span>
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Describe your reel... 🎓"
              maxLength={300}
              style={s.uploadTextarea}
            />
          </div>
          <div style={s.uploadField}>
            <label style={s.uploadLabel}>Tags</label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. comedy, campus, csc201"
              style={s.uploadInput}
            />
            <span style={s.uploadHint}>Comma separated</span>
          </div>

          {error && <div style={s.uploadError}>⚠️ {error}</div>}

          <button
            onClick={handleUpload}
            disabled={!videoFile || uploading}
            style={{
              ...s.uploadSubmitBtn,
              opacity: videoFile && !uploading ? 1 : 0.5,
            }}
          >
            {uploading ? "Uploading to Cloudinary..." : "🚀 Post Reel"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── 3-dot Menu ─────────────────────────────────────────────
const ReelMenu = ({ reelId, isOwner, onDelete, onClose }) => (
  <div
    style={s.menuOverlay}
    onClick={(e) => e.target === e.currentTarget && onClose()}
  >
    <div style={s.menu}>
      <div style={s.menuHandle} />
      {isOwner && (
        <button
          onClick={() => {
            onDelete(reelId);
            onClose();
          }}
          style={s.menuItem}
        >
          <span>🗑️</span>
          <span style={{ color: "#EF4444" }}>Delete Reel</span>
        </button>
      )}
      <button
        onClick={() => {
          navigator.clipboard.writeText(
            `${window.location.origin}/reels/${reelId}`,
          );
          onClose();
        }}
        style={s.menuItem}
      >
        <span>🔗</span>
        <span>Copy Link</span>
      </button>
      <button
        onClick={onClose}
        style={{ ...s.menuItem, color: "#94A3B8", justifyContent: "center" }}
      >
        Cancel
      </button>
    </div>
  </div>
);

// ── Single Reel Card ───────────────────────────────────────
const ReelCard = ({ reel, isActive, currentUserId, onDelete }) => {
  const navigate = useNavigate();
  const videoRef = useRef(null);

  const [liked, setLiked] = useState(reel.isLiked);
  const [likeCount, setLikeCount] = useState(reel.likesCount);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [heartBursts, setHeartBursts] = useState([]);
  const [captionExpanded, setCaptionExpanded] = useState(false);

  const isOwner =
    reel.author?._id === currentUserId ||
    reel.author?._id?.toString() === currentUserId?.toString();
  const caption = reel.caption || "";
  const isLongCaption = caption.length > 80;
  const displayCaption =
    captionExpanded || !isLongCaption ? caption : caption.slice(0, 80) + "...";

  // Auto play/pause
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      // Small delay lets the previous video's pause effect run first
      const timer = setTimeout(() => {
        video
          .play()
          .then(() => setPlaying(true))
          .catch(() => {});
      }, 50);
      return () => clearTimeout(timer);
    } else {
      // Pause immediately — no delay
      video.pause();
      video.currentTime = 0;
      setPlaying(false);
    }
  }, [isActive]);

  // Buffering detection
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onWaiting = () => setBuffering(true);
    const onCanPlay = () => setBuffering(false);
    const onPlaying = () => setBuffering(false);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("playing", onPlaying);
    return () => {
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("playing", onPlaying);
    };
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
  };

  const handleLike = async () => {
    setLiked((p) => !p);
    setLikeCount((p) => (liked ? p - 1 : p + 1));
    try {
      await toggleLike(reel._id);
    } catch {
      setLiked((p) => !p);
      setLikeCount((p) => (liked ? p + 1 : p - 1));
    }
  };

  // Double-tap to like
  const lastTapRef = useRef(0);
  const handleTap = (e) => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      // Double tap detected
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setHeartBursts((p) => [...p, { id: now, x, y }]);
      if (!liked) {
        setLiked(true);
        setLikeCount((p) => p + 1);
        toggleLike(reel._id).catch(() => {});
      }
    } else {
      togglePlay();
    }
    lastTapRef.current = now;
  };

  const handleFollow = async (e) => {
    e.stopPropagation();
    if (followLoading) return;
    setFollowLoading(true);
    setFollowing((p) => !p);
    try {
      await toggleFollow(reel.author?.username);
    } catch {
      setFollowing((p) => !p);
    }
    setFollowLoading(false);
  };

  return (
    <div style={s.reelCard}>
      {/* Video */}
      <div style={s.videoWrap} onClick={handleTap}>
        <video
          ref={videoRef}
          src={reel.videoUrl}
          poster={reel.thumbnailUrl}
          loop
          muted={muted}
          playsInline
          style={s.video}
        />

        {/* Buffering spinner */}
        {buffering && <BufferingSpinner />}

        {/* Heart bursts on double tap */}
        {heartBursts.map((h) => (
          <HeartBurst
            key={h.id}
            x={h.x}
            y={h.y}
            onDone={() => setHeartBursts((p) => p.filter((b) => b.id !== h.id))}
          />
        ))}

        {/* Play/Pause indicator — only flash briefly */}
        {!playing && !buffering && (
          <div style={s.playOverlay}>
            <span style={s.playIcon}>▶</span>
          </div>
        )}

        {/* Bottom gradient */}
        <div style={s.videoGradient} />

        {/* Video info overlay */}
        <div style={s.videoInfo}>
          {/* Author row */}
          <div style={s.videoAuthorRow}>
            <div
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/profile/${reel.author?.username}`);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
              }}
            >
              <Avatar user={reel.author} size={36} />
              <div>
                <div style={s.videoAuthorName}>{reel.author?.fullName}</div>
                <div style={s.videoAuthorMeta}>{reel.author?.department}</div>
              </div>
            </div>
            {/* Follow button — only show if not own reel */}
            {!isOwner && (
              <button
                onClick={handleFollow}
                disabled={followLoading}
                style={{ ...s.followBtn, ...(following ? s.followingBtn : {}) }}
              >
                {following ? "✓ Following" : "+ Follow"}
              </button>
            )}
          </div>

          {/* Caption with expand/collapse */}
          {caption && (
            <div style={s.captionWrap}>
              <span style={s.videoCaption}>{displayCaption}</span>
              {isLongCaption && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCaptionExpanded((p) => !p);
                  }}
                  style={s.captionToggle}
                >
                  {captionExpanded ? " Show less" : " Show more"}
                </button>
              )}
            </div>
          )}

          {/* Tags */}
          {reel.tags?.length > 0 && (
            <div style={s.videoTags}>
              {reel.tags.map((t) => (
                <span key={t} style={s.videoTag}>
                  #{t}
                </span>
              ))}
            </div>
          )}

          {/* Spinning disc */}
          <SpinningDisc sound={reel.sound} isPlaying={playing} />
        </div>

        {/* Video progress bar */}
        <VideoProgress videoRef={videoRef} />
      </div>

      {/* Right action buttons */}
      <div style={s.reelActions}>
        {/* Mute */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMuted((p) => !p);
          }}
          style={s.reelActionBtn}
        >
          <span style={s.reelActionIcon}>{muted ? "🔇" : "🔊"}</span>
        </button>

        {/* Like */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleLike();
          }}
          style={s.reelActionBtn}
        >
          <span
            style={{
              ...s.reelActionIcon,
              fontSize: 30,
              filter: liked ? "none" : "drop-shadow(0 1px 3px rgba(0,0,0,0.5))",
              transform: liked ? "scale(1.15)" : "scale(1)",
              transition: "transform 0.15s",
            }}
          >
            {liked ? "❤️" : "🤍"}
          </span>
          <span style={s.reelActionCount}>{likeCount}</span>
        </button>

        {/* Comment */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowComments(true);
          }}
          style={s.reelActionBtn}
        >
          <span style={s.reelActionIcon}>💬</span>
          <span style={s.reelActionCount}>{reel.commentsCount}</span>
        </button>

        {/* Share */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigator
              .share?.({
                url: `${window.location.origin}/reels/${reel._id}`,
                title: reel.caption,
              })
              .catch(() => {});
          }}
          style={s.reelActionBtn}
        >
          <span style={s.reelActionIcon}>🔁</span>
        </button>

        {/* Views */}
        <div style={s.reelActionBtn}>
          <span style={s.reelActionIcon}>👁️</span>
          <span style={s.reelActionCount}>{reel.views}</span>
        </div>

        {/* 3-dot menu */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(true);
          }}
          style={s.reelActionBtn}
        >
          <span style={{ ...s.reelActionIcon, fontSize: 20, letterSpacing: 1 }}>
            •••
          </span>
        </button>
      </div>

      {/* Drawers & Menus */}
      {showComments && (
        <CommentsDrawer
          reelId={reel._id}
          commentsCount={reel.commentsCount}
          onClose={() => setShowComments(false)}
        />
      )}
      {showMenu && (
        <ReelMenu
          reelId={reel._id}
          isOwner={isOwner}
          onDelete={onDelete}
          onClose={() => setShowMenu(false)}
        />
      )}
    </div>
  );
};

// ── Main Reels Page ────────────────────────────────────────
const ReelsPage = () => {
  const { user } = useAuthStore();
  const [reels, setReels] = useState([]);
  const [trending, setTrending] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [activeTab, setActiveTab] = useState("feed");
  const containerRef = useRef(null);

  const loadReels = useCallback(async (pageNum = 1, reset = false) => {
    try {
      const res = await getReels(pageNum);
      const newReels = res.data.data?.reels || [];
      const meta = res.data.meta || {};
      setReels((p) => (reset ? newReels : [...p, ...newReels]));
      setHasMore(meta.hasMore || false);
      setPage(pageNum);
    } catch (_) {}
    setLoading(false);
  }, []);

  useEffect(() => {
    loadReels(1, true);
    getTrending()
      .then((res) => setTrending(res.data.data?.reels || []))
      .catch(() => {});
  }, []);

  // Snap scroll observer
  useEffect(() => {
    const cards = containerRef.current?.querySelectorAll("[data-reel-index]");
    if (!cards || cards.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the most visible entry — prevents two reels firing simultaneously
        let mostVisible = null;
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (
              !mostVisible ||
              entry.intersectionRatio > mostVisible.intersectionRatio
            ) {
              mostVisible = entry;
            }
          }
        });

        if (mostVisible) {
          const index = parseInt(mostVisible.target.dataset.reelIndex);
          setActiveIndex(index);
          if (index >= reels.length - 2 && hasMore) loadReels(page + 1);
        }
      },
      { threshold: [0.5, 0.75, 1.0], root: containerRef.current },
    );

    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [reels, hasMore, page]);

  const handleUploaded = (reel) => {
    setReels((p) => [reel, ...p]);
    setActiveIndex(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (reelId) => {
    try {
      await deleteReel(reelId);
      setReels((p) => p.filter((r) => r._id !== reelId));
    } catch (_) {}
  };

  return (
    <div style={s.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        video { display: block; }
        textarea:focus, input:focus { outline: none; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes heartBurst {
          0%   { transform: scale(0.3); opacity: 1; }
          50%  { transform: scale(1.4); opacity: 1; }
          100% { transform: scale(1.1); opacity: 0; }
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>

      {/* Header */}
      <div style={s.header}>
        <div style={s.tabs}>
          {["feed", "trending"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{ ...s.tabBtn, ...(activeTab === tab ? s.tabActive : {}) }}
            >
              {tab === "feed" ? "📱 For You" : "🔥 Trending"}
            </button>
          ))}
        </div>
        <button onClick={() => setShowUpload(true)} style={s.uploadBtn}>
          + Upload
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div style={s.loadingState}>
          <div style={s.spinner} />
          <p style={{ color: "#64748B", fontSize: 14, marginTop: 12 }}>
            Loading reels...
          </p>
        </div>
      )}

      {/* Feed — true snap scroll */}
      {!loading &&
        activeTab === "feed" &&
        (reels.length === 0 ? (
          <div style={s.emptyState}>
            <span style={{ fontSize: 52 }}>🎬</span>
            <h3 style={s.emptyTitle}>No reels yet</h3>
            <p style={s.emptyText}>
              Be the first LASU student to upload a reel!
            </p>
            <button
              onClick={() => setShowUpload(true)}
              style={s.emptyUploadBtn}
            >
              Upload First Reel
            </button>
          </div>
        ) : (
          <div ref={containerRef} style={s.reelsContainer}>
            {reels.map((reel, i) => (
              <div key={reel._id} data-reel-index={i} style={s.reelWrapper}>
                <ReelCard
                  reel={reel}
                  isActive={i === activeIndex}
                  currentUserId={user?._id}
                  onDelete={handleDelete}
                />
              </div>
            ))}
            {!hasMore && reels.length > 0 && (
              <div style={s.endCard}>
                <span style={{ fontSize: 32 }}>🎓</span>
                <p
                  style={{
                    color: "white",
                    marginTop: 8,
                    fontSize: 14,
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  You've seen all reels!
                </p>
              </div>
            )}
          </div>
        ))}

      {/* Trending tab */}
      {!loading && activeTab === "trending" && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <h2
              style={{
                fontFamily: "Geist, sans-serif",
                fontWeight: 800,
                fontSize: 18,
                color: "#0F172A",
              }}
            >
              🔥 Top Reels This Week
            </h2>
          </div>
          {trending.length === 0 ? (
            <div style={s.emptyState}>
              <span style={{ fontSize: 40 }}>📊</span>
              <p style={{ color: "#64748B", fontSize: 14, marginTop: 8 }}>
                No trending reels yet this week
              </p>
            </div>
          ) : (
            <div style={s.trendingGrid}>
              {trending.map((reel, i) => (
                <div key={reel._id} style={s.trendingCard}>
                  <div style={s.rankBadge}>#{i + 1}</div>
                  <div style={s.trendingThumb}>
                    {reel.thumbnailUrl ? (
                      <img
                        src={reel.thumbnailUrl}
                        alt=""
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          background: "#1E293B",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 28,
                        }}
                      >
                        🎬
                      </div>
                    )}
                    <div style={s.trendingOverlay}>
                      <span
                        style={{
                          color: "white",
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        ❤️ {reel.likesCount}
                      </span>
                      <span
                        style={{
                          color: "white",
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        👁️ {reel.views}
                      </span>
                    </div>
                  </div>
                  <div style={s.trendingInfo}>
                    <div style={s.trendingAuthor}>{reel.author?.fullName}</div>
                    {reel.caption && (
                      <p style={s.trendingCaption}>
                        {reel.caption.slice(0, 60)}
                        {reel.caption.length > 60 ? "..." : ""}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upload modal */}
      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onUploaded={handleUploaded}
        />
      )}
    </div>
  );
};

// ─── Styles ───────────────────────────────────────────────
const s = {
  page: { paddingBottom: 80, fontFamily: "'DM Sans', sans-serif" },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  tabs: {
    display: "flex",
    gap: 4,
    background: "white",
    padding: 5,
    borderRadius: 12,
    border: "1px solid #E2E8F0",
  },
  tabBtn: {
    padding: "7px 14px",
    borderRadius: 8,
    border: "none",
    background: "transparent",
    fontSize: 13,
    fontWeight: 600,
    color: "#64748B",
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    transition: "all 0.15s",
  },
  tabActive: { background: "#0F172A", color: "white" },
  uploadBtn: {
    padding: "8px 18px",
    borderRadius: 10,
    border: "none",
    background: "linear-gradient(135deg, #1D4ED8, #3B82F6)",
    color: "white",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "Geist, sans-serif",
    boxShadow: "0 3px 10px rgba(37,99,235,0.3)",
  },

  loadingState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "80px 0",
  },
  spinner: {
    width: 32,
    height: 32,
    border: "3px solid #E2E8F0",
    borderTopColor: "#2563EB",
    borderRadius: "50%",
    animation: "spin 0.7s linear infinite",
  },

  // Snap scroll container
  reelsContainer: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    overflowY: "auto",
    scrollSnapType: "y mandatory",
    maxHeight: "calc(100vh - 140px)",
    scrollbarWidth: "none",
  },
  reelWrapper: {
    scrollSnapAlign: "start",
    scrollSnapStop: "always",
    flexShrink: 0,
  },

  reelCard: {
    position: "relative",
    borderRadius: 20,
    overflow: "hidden",
    background: "#0F172A",
    aspectRatio: "9/16",
    maxHeight: 580,
  },
  videoWrap: {
    position: "relative",
    width: "100%",
    height: "100%",
    cursor: "pointer",
    userSelect: "none",
  },
  video: { width: "100%", height: "100%", objectFit: "cover" },

  playOverlay: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(0,0,0,0.25)",
    animation: "fadeIn 0.15s ease",
    pointerEvents: "none",
    zIndex: 10,
  },
  playIcon: {
    fontSize: 56,
    color: "white",
    opacity: 0.85,
    filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.5))",
  },
  videoGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "65%",
    background:
      "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)",
    pointerEvents: "none",
  },

  videoInfo: {
    position: "absolute",
    bottom: 8,
    left: 0,
    right: 68,
    padding: "0 14px 10px",
    zIndex: 5,
  },
  videoAuthorRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  videoAuthorName: {
    color: "white",
    fontWeight: 700,
    fontSize: 14,
    fontFamily: "Geist, sans-serif",
    textShadow: "0 1px 4px rgba(0,0,0,0.5)",
  },
  videoAuthorMeta: { color: "rgba(255,255,255,0.65)", fontSize: 11 },

  followBtn: {
    padding: "5px 14px",
    borderRadius: 20,
    border: "1.5px solid white",
    background: "transparent",
    color: "white",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "Geist, sans-serif",
    flexShrink: 0,
    transition: "all 0.15s",
  },
  followingBtn: {
    background: "rgba(255,255,255,0.2)",
    borderColor: "rgba(255,255,255,0.5)",
  },

  captionWrap: { marginBottom: 6 },
  videoCaption: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 13,
    lineHeight: 1.5,
  },
  captionToggle: {
    background: "none",
    border: "none",
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    cursor: "pointer",
    fontWeight: 700,
    padding: 0,
    fontFamily: "'DM Sans', sans-serif",
  },

  videoTags: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4 },
  videoTag: { color: "#93C5FD", fontSize: 12, fontWeight: 600 },

  // Right action buttons
  reelActions: {
    position: "absolute",
    right: 10,
    bottom: 20,
    display: "flex",
    flexDirection: "column",
    gap: 18,
    alignItems: "center",
    zIndex: 10,
  },
  reelActionBtn: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 0,
  },
  reelActionIcon: {
    fontSize: 26,
    filter: "drop-shadow(0 1px 4px rgba(0,0,0,0.6))",
  },
  reelActionCount: {
    color: "white",
    fontSize: 11,
    fontWeight: 700,
    fontFamily: "Geist, sans-serif",
    textShadow: "0 1px 4px rgba(0,0,0,0.6)",
  },

  // Trending
  trendingGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  trendingCard: {
    background: "white",
    borderRadius: 14,
    overflow: "hidden",
    border: "1px solid #E2E8F0",
    position: "relative",
  },
  rankBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    zIndex: 2,
    background: "linear-gradient(135deg, #1D4ED8, #3B82F6)",
    color: "white",
    borderRadius: 20,
    padding: "2px 10px",
    fontSize: 11,
    fontWeight: 800,
    fontFamily: "Geist, sans-serif",
  },
  trendingThumb: {
    aspectRatio: "9/16",
    position: "relative",
    background: "#0F172A",
    overflow: "hidden",
  },
  trendingOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent)",
    padding: "16px 8px 8px",
    display: "flex",
    justifyContent: "space-between",
  },
  trendingInfo: { padding: "10px 12px" },
  trendingAuthor: {
    fontFamily: "Geist, sans-serif",
    fontWeight: 700,
    fontSize: 13,
    color: "#0F172A",
    marginBottom: 4,
  },
  trendingCaption: { fontSize: 12, color: "#64748B", lineHeight: 1.4 },

  emptyState: { textAlign: "center", padding: "60px 20px" },
  emptyTitle: {
    fontFamily: "Geist, sans-serif",
    fontWeight: 700,
    fontSize: 20,
    color: "#0F172A",
    margin: "12px 0 8px",
  },
  emptyText: { fontSize: 14, color: "#64748B", marginBottom: 20 },
  emptyUploadBtn: {
    padding: "10px 24px",
    borderRadius: 12,
    border: "none",
    background: "linear-gradient(135deg, #1D4ED8, #3B82F6)",
    color: "white",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "Geist, sans-serif",
  },
  endCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 48,
    background: "#0F172A",
    borderRadius: 20,
  },

  // Comments drawer
  drawerOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.55)",
    zIndex: 200,
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
  },
  drawer: {
    background: "white",
    borderRadius: "20px 20px 0 0",
    width: "100%",
    maxWidth: 680,
    animation: "slideUp 0.3s ease",
    display: "flex",
    flexDirection: "column",
    maxHeight: "80vh",
  },
  drawerHandle: {
    width: 40,
    height: 4,
    background: "#E2E8F0",
    borderRadius: 4,
    margin: "12px auto 0",
  },
  drawerHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 20px",
    borderBottom: "1px solid #F1F5F9",
  },
  drawerTitle: {
    fontFamily: "Geist, sans-serif",
    fontWeight: 700,
    fontSize: 16,
    color: "#0F172A",
  },
  drawerClose: {
    background: "none",
    border: "none",
    fontSize: 18,
    cursor: "pointer",
    color: "#94A3B8",
  },
  drawerEmpty: {
    textAlign: "center",
    padding: 32,
    color: "#94A3B8",
    fontSize: 14,
  },

  commentsList: {
    flex: 1,
    overflowY: "auto",
    padding: "12px 16px",
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  commentRow: { display: "flex", gap: 10, alignItems: "flex-start" },
  commentContent: { flex: 1 },
  commentName: {
    fontFamily: "Geist, sans-serif",
    fontWeight: 700,
    fontSize: 13,
    color: "#0F172A",
    marginBottom: 2,
  },
  commentText: { fontSize: 13.5, color: "#374151", lineHeight: 1.5 },
  commentMeta: { fontSize: 11, color: "#94A3B8", marginTop: 4 },
  commentForm: {
    display: "flex",
    gap: 10,
    padding: "12px 16px",
    borderTop: "1px solid #F1F5F9",
    alignItems: "center",
  },
  commentInput: {
    flex: 1,
    padding: "9px 14px",
    border: "1.5px solid #E2E8F0",
    borderRadius: 20,
    fontSize: 13,
    background: "#F8FAFC",
    color: "#0F172A",
    fontFamily: "'DM Sans', sans-serif",
  },
  commentSend: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: "#2563EB",
    color: "white",
    border: "none",
    fontSize: 16,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  // 3-dot menu
  menuOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.55)",
    zIndex: 300,
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
  },
  menu: {
    background: "white",
    borderRadius: "20px 20px 0 0",
    width: "100%",
    maxWidth: 680,
    animation: "slideUp 0.25s ease",
    padding: "0 0 24px",
  },
  menuHandle: {
    width: 40,
    height: 4,
    background: "#E2E8F0",
    borderRadius: 4,
    margin: "12px auto 8px",
  },
  menuItem: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    width: "100%",
    padding: "14px 24px",
    background: "none",
    border: "none",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    color: "#0F172A",
    transition: "background 0.15s",
  },

  // Upload
  videoPicker: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    border: "2px dashed #E2E8F0",
    borderRadius: 16,
    padding: "48px 20px",
    cursor: "pointer",
    marginBottom: 20,
    gap: 8,
    background: "#F8FAFC",
  },
  videoPickerText: {
    fontFamily: "Geist, sans-serif",
    fontWeight: 700,
    fontSize: 15,
    color: "#0F172A",
  },
  videoPickerSub: { fontSize: 12, color: "#94A3B8" },
  videoPreviewWrap: { marginBottom: 20 },
  videoPreview: {
    width: "100%",
    maxHeight: 280,
    objectFit: "cover",
    display: "block",
    borderRadius: 12,
  },
  changeVideoBtn: {
    width: "100%",
    marginTop: 8,
    padding: "8px",
    border: "1.5px solid #E2E8F0",
    borderRadius: 8,
    background: "white",
    fontSize: 13,
    fontWeight: 600,
    color: "#374151",
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  },
  uploadField: { marginBottom: 16 },
  uploadLabel: {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: "#374151",
    marginBottom: 6,
  },
  uploadTextarea: {
    width: "100%",
    padding: "10px 12px",
    border: "1.5px solid #E2E8F0",
    borderRadius: 10,
    fontSize: 14,
    color: "#0F172A",
    background: "#F8FAFC",
    fontFamily: "'DM Sans', sans-serif",
    resize: "none",
    height: 90,
    lineHeight: 1.5,
  },
  uploadInput: {
    width: "100%",
    padding: "10px 12px",
    border: "1.5px solid #E2E8F0",
    borderRadius: 10,
    fontSize: 14,
    color: "#0F172A",
    background: "#F8FAFC",
    fontFamily: "'DM Sans', sans-serif",
  },
  uploadHint: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 4,
    display: "block",
  },
  uploadError: {
    background: "#FEF2F2",
    border: "1px solid #FECACA",
    borderRadius: 8,
    padding: "8px 12px",
    fontSize: 13,
    color: "#DC2626",
    marginBottom: 12,
  },
  uploadSubmitBtn: {
    width: "100%",
    padding: 13,
    border: "none",
    borderRadius: 12,
    background: "linear-gradient(135deg, #1D4ED8, #3B82F6)",
    color: "white",
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "Geist, sans-serif",
    boxShadow: "0 4px 14px rgba(37,99,235,0.35)",
    transition: "opacity 0.15s",
  },
};

export default ReelsPage;
