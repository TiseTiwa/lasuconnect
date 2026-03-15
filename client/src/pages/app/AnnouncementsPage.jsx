import { useState, useEffect, useRef } from "react";
import useAuthStore from "../../context/useAuthStore";
import { useSocket } from "../../context/SocketContext";
import {
  getAnnouncements,
  getAnnouncement,
  markAsRead,
  markAllAsRead,
  deleteAnnouncement,
  togglePin,
  createAnnouncement,
  getComments,
  addComment,
  deleteComment,
} from "../../services/announcementsService";

const timeAgo = (date) => {
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(date).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
};

const SCOPE_CONFIG = {
  university: { label: "🏛️ University-Wide", color: "#7C3AED", bg: "#F5F3FF" },
  faculty:    { label: "🏫 Faculty",          color: "#2563EB", bg: "#EFF6FF" },
  department: { label: "📚 Department",       color: "#059669", bg: "#F0FDF4" },
  course:     { label: "📖 Course",           color: "#D97706", bg: "#FFFBEB" },
  level:      { label: "🎓 Level",            color: "#DC2626", bg: "#FEF2F2" },
};

const PRIORITY_CONFIG = {
  normal:    { color: "#64748B", bg: "#F1F5F9", dot: "#E2E8F0" },
  important: { color: "#D97706", bg: "#FFFBEB", dot: "#D97706", label: "⚠️ Important" },
  urgent:    { color: "#DC2626", bg: "#FEF2F2", dot: "#DC2626", label: "🚨 Urgent" },
};

const ALLOWED_POSTER_ROLES = ["admin", "super_admin", "lecturer", "course_rep"];
const FACULTIES = [
  "Faculty of Science", "Faculty of Engineering", "Faculty of Law",
  "Faculty of Management Sciences", "Faculty of Social Sciences",
  "Faculty of Arts", "Faculty of Education", "Faculty of Environmental Sciences",
  "Faculty of Medicine", "College of Agriculture",
];

// ── Avatar ─────────────────────────────────────────────────
const Avatar = ({ user, size = 36 }) => {
  const initials = user?.fullName?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";
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

// ── Share helper — Fix 1: optional chaining on content ─────
const shareAnnouncement = async (announcement) => {
  const url     = `${window.location.origin}/announcements/${announcement._id}`;
  const preview = announcement.content?.slice(0, 120) || "";
  const text    = `📢 ${announcement.title}\n\n${preview}${preview.length === 120 ? "..." : ""}\n\nRead on LASUConnect: ${url}`;
  if (navigator.share) {
    try { await navigator.share({ title: announcement.title, text, url }); return; }
    catch (_) {}
  }
  await navigator.clipboard.writeText(url);
  return "copied";
};

// ── Comments Section ───────────────────────────────────────
const CommentsSection = ({ announcementId, currentUser }) => {
  const [comments, setComments]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [text, setText]             = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getComments(announcementId)
      .then((res) => setComments(res.data.data.comments))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [announcementId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await addComment(announcementId, text.trim());
      setComments((p) => [...p, res.data.data.comment]);
      setText("");
    } catch (_) {}
    setSubmitting(false);
  };

  const handleDelete = async (commentId) => {
    try {
      await deleteComment(announcementId, commentId);
      setComments((p) => p.filter((c) => c._id !== commentId));
    } catch (_) {}
  };

  return (
    <div style={s.commentsSection}>
      <div style={s.commentsSectionTitle}>
        💬 Questions & Replies {comments.length > 0 && `(${comments.length})`}
      </div>
      {loading ? (
        <div style={{ fontSize: 13, color: "#94A3B8", padding: "8px 0" }}>Loading comments...</div>
      ) : comments.length === 0 ? (
        <div style={{ fontSize: 13, color: "#94A3B8", padding: "8px 0" }}>No questions yet. Be the first to ask!</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
          {comments.map((c) => (
            <div key={c._id} style={s.commentRow}>
              <Avatar user={c.author} size={30} />
              <div style={s.commentBubble}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <span style={s.commentAuthor}>{c.author?.fullName}</span>
                    {c.author?.role !== "student" && (
                      <span style={{ ...s.rolePill, marginLeft: 6 }}>{c.author?.role?.replace("_", " ")}</span>
                    )}
                  </div>
                  {(c.author?._id === currentUser?._id || ["admin", "super_admin"].includes(currentUser?.role)) && (
                    <button onClick={() => handleDelete(c._id)}
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#EF4444", padding: "0 2px" }}>✕</button>
                  )}
                </div>
                <div style={s.commentText}>{c.content}</div>
                <div style={s.commentTime}>{timeAgo(c.createdAt)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8 }}>
        <Avatar user={currentUser} size={30} />
        <input value={text} onChange={(e) => setText(e.target.value)}
          placeholder="Ask a question or leave a comment..." style={s.commentInput} />
        <button type="submit" disabled={!text.trim() || submitting}
          style={{ ...s.commentSend, opacity: text.trim() && !submitting ? 1 : 0.5 }}>
          {submitting ? "..." : "→"}
        </button>
      </form>
    </div>
  );
};

// ── Detail View ────────────────────────────────────────────
const DetailView = ({ id, currentUser, onBack }) => {
  const [announcement, setAnnouncement] = useState(null);
  const [loading, setLoading]           = useState(true);
  const [copied, setCopied]             = useState(false);

  useEffect(() => {
    getAnnouncement(id)
      .then((res) => setAnnouncement(res.data.data.announcement))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleShare = async () => {
    const result = await shareAnnouncement(announcement);
    if (result === "copied") { setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><div style={s.spinner} /></div>;
  if (!announcement) return null;

  const scope    = SCOPE_CONFIG[announcement.scope]        || SCOPE_CONFIG.university;
  const priority = PRIORITY_CONFIG[announcement.priority]  || PRIORITY_CONFIG.normal;

  return (
    <div style={{ paddingBottom: 80 }}>
      <button onClick={onBack} style={s.backBtn}>← Announcements</button>
      <div style={{ ...s.card, borderLeft: `4px solid ${priority.dot}` }}>
        {announcement.priority === "urgent" && <div style={s.urgentBanner}>🚨 URGENT ANNOUNCEMENT</div>}
        {announcement.isPinned && <div style={s.pinnedTag}>📌 Pinned</div>}
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 16 }}>
          <Avatar user={announcement.author} size={48} />
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={s.authorName}>{announcement.author?.fullName}</span>
              <span style={s.rolePill}>{announcement.author?.role?.replace("_", " ")}</span>
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 5, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ ...s.scopeBadge, background: scope.bg, color: scope.color }}>{scope.label}</span>
              {priority.label && <span style={{ ...s.scopeBadge, background: priority.bg, color: priority.color }}>{priority.label}</span>}
              {announcement.targetDepartment && <span style={s.targetTag}>{announcement.targetDepartment}</span>}
              {announcement.targetLevel      && <span style={s.targetTag}>{announcement.targetLevel} Level</span>}
              <span style={s.timeText}>{timeAgo(announcement.createdAt)}</span>
            </div>
          </div>
          <button onClick={handleShare} style={s.shareBtn}>{copied ? "✅ Copied!" : "🔗 Share"}</button>
        </div>
        <h2 style={{ fontFamily: "Geist, sans-serif", fontWeight: 800, fontSize: 22, color: "#0F172A", marginBottom: 14, lineHeight: 1.3 }}>
          {announcement.title}
        </h2>
        {/* Fix 2: nullish coalescing on content */}
        <div style={{ fontSize: 15, color: "#374151", lineHeight: 1.8, whiteSpace: "pre-wrap", marginBottom: 16 }}>
          {announcement.content ?? ""}
        </div>
        {announcement.mediaUrl && <img src={announcement.mediaUrl} alt="" style={{ ...s.mediaImg, maxHeight: 500 }} />}
        {announcement.attachmentUrl && (
          <a href={announcement.attachmentUrl} target="_blank" rel="noreferrer" style={s.attachment}>
            📄 {announcement.attachmentName || "View Attachment"}
          </a>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 14, borderTop: "1px solid #F1F5F9", marginTop: 8 }}>
          <div style={{ display: "flex", gap: 16 }}>
            <span style={{ fontSize: 13, color: "#94A3B8" }}>👁️ {announcement.readCount ?? 0} read</span>
            <span style={{ fontSize: 13, color: "#94A3B8" }}>💬 {announcement.commentsCount ?? 0} comments</span>
          </div>
          {announcement.expiresAt && (
            <span style={{ fontSize: 12, color: "#94A3B8" }}>Expires {new Date(announcement.expiresAt).toLocaleDateString()}</span>
          )}
        </div>
      </div>
      <CommentsSection announcementId={id} currentUser={currentUser} />
    </div>
  );
};

// ── Create Modal ───────────────────────────────────────────
const CreateModal = ({ user, onClose, onCreated }) => {
  const [form, setForm] = useState({
    title: "", content: "", scope: "department",
    targetFaculty: user?.faculty || "", targetDepartment: user?.department || "",
    targetLevel: "", priority: "normal", isPinned: false, expiresAt: "",
  });
  const [file, setFile]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const fileRef = useRef(null);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v !== "") fd.append(k, v); });
      if (file) fd.append("attachment", file);
      const res = await createAnnouncement(fd);
      onCreated(res.data.data.announcement);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to post.");
    }
    setLoading(false);
  };

  return (
    <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        <div style={s.modalHeader}>
          <h3 style={s.modalTitle}>Post Announcement</h3>
          <button onClick={onClose} style={s.closeBtn}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14, overflowY: "auto", maxHeight: "75vh" }}>
          <div>
            <label style={s.label}>Title *</label>
            <input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Change of Venue for CSC 301 Exam" style={s.input} required />
          </div>
          <div>
            <label style={s.label}>Content *</label>
            <textarea value={form.content} onChange={(e) => set("content", e.target.value)} placeholder="Write the full announcement..." rows={4} style={{ ...s.input, resize: "none", height: 100 }} required />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={s.label}>Audience</label>
              <select value={form.scope} onChange={(e) => set("scope", e.target.value)} style={s.select}>
                <option value="university">🏛️ University-Wide</option>
                <option value="faculty">🏫 Faculty</option>
                <option value="department">📚 Department</option>
                <option value="level">🎓 Level</option>
              </select>
            </div>
            <div>
              <label style={s.label}>Priority</label>
              <select value={form.priority} onChange={(e) => set("priority", e.target.value)} style={s.select}>
                <option value="normal">Normal</option>
                <option value="important">⚠️ Important</option>
                <option value="urgent">🚨 Urgent</option>
              </select>
            </div>
          </div>
          {form.scope === "faculty" && (
            <div>
              <label style={s.label}>Target Faculty</label>
              <select value={form.targetFaculty} onChange={(e) => set("targetFaculty", e.target.value)} style={s.select}>
                {FACULTIES.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          )}
          {form.scope === "department" && (
            <div>
              <label style={s.label}>Target Department</label>
              <input value={form.targetDepartment} onChange={(e) => set("targetDepartment", e.target.value)} placeholder="e.g. Computer Science" style={s.input} />
            </div>
          )}
          {form.scope === "level" && (
            <div>
              <label style={s.label}>Target Level</label>
              <select value={form.targetLevel} onChange={(e) => set("targetLevel", e.target.value)} style={s.select}>
                <option value="">Select level</option>
                {["100", "200", "300", "400", "500"].map((l) => <option key={l} value={l}>{l} Level</option>)}
              </select>
            </div>
          )}
          <div>
            <label style={s.label}>Expires On (optional)</label>
            <input type="date" value={form.expiresAt} onChange={(e) => set("expiresAt", e.target.value)} style={s.input} />
          </div>
          <div>
            <label style={s.label}>Attachment (PDF or Image, optional)</label>
            <div onClick={() => fileRef.current?.click()} style={{ border: "2px dashed #E2E8F0", borderRadius: 10, padding: 14, textAlign: "center", cursor: "pointer", background: "#F8FAFC" }}>
              {file
                ? <span style={{ fontSize: 13, color: "#2563EB", fontWeight: 600 }}>📎 {file.name}</span>
                : <span style={{ fontSize: 13, color: "#94A3B8" }}>📁 Click to attach a file</span>
              }
            </div>
            <input ref={fileRef} type="file" accept=".pdf,image/*" onChange={(e) => setFile(e.target.files[0])} style={{ display: "none" }} />
          </div>
          {["admin", "super_admin"].includes(user?.role) && (
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14, color: "#374151" }}>
              <input type="checkbox" checked={form.isPinned} onChange={(e) => set("isPinned", e.target.checked)} style={{ width: 16, height: 16 }} />
              📌 Pin this announcement to the top
            </label>
          )}
          {error && <div style={s.errorBanner}>⚠️ {error}</div>}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose} style={s.cancelBtn}>Cancel</button>
            <button type="submit" disabled={loading} style={{ ...s.postBtn, opacity: loading ? 0.7 : 1 }}>
              {loading ? "Posting..." : "📢 Post Announcement"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Announcement Card ──────────────────────────────────────
const AnnouncementCard = ({ announcement, currentUser, onRead, onDelete, onPin, onOpen }) => {
  const [copied, setCopied] = useState(false);
  const scope    = SCOPE_CONFIG[announcement.scope]        || SCOPE_CONFIG.university;
  const priority = PRIORITY_CONFIG[announcement.priority]  || PRIORITY_CONFIG.normal;
  const isAuthor = announcement.author?._id?.toString() === currentUser?._id?.toString();
  const isAdmin  = ["admin", "super_admin"].includes(currentUser?.role);

  // Fix 3: derive length once safely
  const contentLength = announcement.content?.length || 0;

  const handleShare = async (e) => {
    e.stopPropagation();
    const result = await shareAnnouncement(announcement);
    if (result === "copied") { setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  const handleCardClick = () => {
    if (!announcement.isRead) onRead(announcement._id);
    onOpen(announcement._id);
  };

  return (
    <div onClick={handleCardClick}
      style={{ ...s.card, cursor: "pointer", background: announcement.isRead ? "white" : "#F8FAFF", borderLeft: announcement.isRead ? "4px solid #E2E8F0" : `4px solid ${priority.dot}` }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)")}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.04)")}
    >
      {announcement.priority === "urgent" && <div style={s.urgentBanner}>🚨 URGENT ANNOUNCEMENT</div>}
      {announcement.isPinned && <div style={s.pinnedTag}>📌 Pinned</div>}

      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 10 }}>
        <Avatar user={announcement.author} size={42} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 3 }}>
            <span style={s.authorName}>{announcement.author?.fullName}</span>
            <span style={s.rolePill}>{announcement.author?.role?.replace("_", " ")}</span>
            {!announcement.isRead && <div style={s.unreadDot} />}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ ...s.scopeBadge, background: scope.bg, color: scope.color }}>{scope.label}</span>
            {priority.label && <span style={{ ...s.scopeBadge, background: priority.bg, color: priority.color }}>{priority.label}</span>}
            {announcement.targetDepartment && <span style={s.targetTag}>{announcement.targetDepartment}</span>}
            {announcement.targetLevel      && <span style={s.targetTag}>{announcement.targetLevel} Level</span>}
            <span style={s.timeText}>{timeAgo(announcement.createdAt)}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
          <button onClick={handleShare} title="Share" style={{ ...s.iconBtn, color: copied ? "#10B981" : "#94A3B8" }}>
            {copied ? "✅" : "🔗"}
          </button>
          {isAdmin && (
            <button onClick={() => onPin(announcement._id)} title={announcement.isPinned ? "Unpin" : "Pin"}
              style={{ ...s.iconBtn, color: announcement.isPinned ? "#D97706" : "#94A3B8" }}>📌</button>
          )}
          {(isAuthor || isAdmin) && (
            <button onClick={() => onDelete(announcement._id)} style={{ ...s.iconBtn, color: "#EF4444" }}>🗑️</button>
          )}
        </div>
      </div>

      <h3 style={s.cardTitle}>{announcement.title}</h3>

      {/* Fix 4: all content accesses safe */}
      <div style={{ fontSize: 14, color: "#64748B", lineHeight: 1.6, marginBottom: 10 }}>
        {announcement.content?.slice(0, 140) ?? ""}
        {contentLength > 140 ? "..." : ""}
        {contentLength > 140 && (
          <span style={{ color: "#2563EB", fontWeight: 600, marginLeft: 4 }}>Read more →</span>
        )}
      </div>

      {announcement.mediaUrl && <img src={announcement.mediaUrl} alt="" style={{ ...s.mediaImg, maxHeight: 160 }} />}
      {announcement.attachmentUrl && (
        <div style={{ ...s.attachment, display: "inline-flex", marginBottom: 8 }} onClick={(e) => e.stopPropagation()}>
          <a href={announcement.attachmentUrl} target="_blank" rel="noreferrer"
            style={{ color: "#2563EB", textDecoration: "none", fontSize: 13, fontWeight: 600 }}>
            📄 {announcement.attachmentName || "View Attachment"}
          </a>
        </div>
      )}

      <div style={s.cardFooter}>
        <div style={{ display: "flex", gap: 12 }}>
          <span style={{ fontSize: 12, color: "#94A3B8" }}>👁️ {announcement.readCount ?? 0}</span>
          <span style={{ fontSize: 12, color: "#94A3B8" }}>💬 {announcement.commentsCount ?? 0}</span>
        </div>
        {announcement.expiresAt && (
          <span style={{ fontSize: 11, color: "#94A3B8" }}>
            Expires {new Date(announcement.expiresAt).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  );
};

// ── Main Page ──────────────────────────────────────────────
const AnnouncementsPage = () => {
  const { user } = useAuthStore();
  const socket   = useSocket();

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [scopeFilter, setScopeFilter]     = useState("all");
  const [showCreate, setShowCreate]       = useState(false);
  const [page, setPage]                   = useState(1);
  const [hasMore, setHasMore]             = useState(false);
  const [loadingMore, setLoadingMore]     = useState(false);
  const [detailId, setDetailId]           = useState(null);
  const [search, setSearch]               = useState("");
  const [dateFrom, setDateFrom]           = useState("");
  const [dateTo, setDateTo]               = useState("");
  const [showFilters, setShowFilters]     = useState(false);
  const searchDebounce = useRef(null);

  const canPost = ALLOWED_POSTER_ROLES.includes(user?.role);

  const load = async (pageNum = 1, reset = false) => {
    if (pageNum === 1) setLoading(true); else setLoadingMore(true);
    try {
      const params = { page: pageNum, limit: 20 };
      if (scopeFilter !== "all") params.scope  = scopeFilter;
      if (search.trim())         params.search = search.trim();
      if (dateFrom)              params.from   = dateFrom;
      if (dateTo)                params.to     = dateTo;

      const res = await getAnnouncements(params);
      const { announcements: items } = res.data.data;
      const { meta } = res.data;
      setAnnouncements((p) => reset || pageNum === 1 ? items : [...p, ...items]);
      setUnreadCount(meta.unreadCount);
      setHasMore(meta.hasMore);
      setPage(pageNum);
    } catch (_) {}
    setLoading(false);
    setLoadingMore(false);
  };

  useEffect(() => {
    clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => load(1, true), 350);
    return () => clearTimeout(searchDebounce.current);
  }, [scopeFilter, search, dateFrom, dateTo]);

  // Fix 5: skip partial socket objects that have no content field
  useEffect(() => {
    if (!socket) return;
    const handler = (a) => {
      if (!a.content) return; // partial emit from server — onCreated already added the full object
      setAnnouncements((p) => [{ ...a, isRead: false, readCount: 0, commentsCount: 0 }, ...p]);
      setUnreadCount((c) => c + 1);
    };
    socket.on("announcement:new", handler);
    return () => socket.off("announcement:new", handler);
  }, [socket]);

  const handleRead = (id) => {
    setAnnouncements((p) => p.map((a) => a._id === id ? { ...a, isRead: true, readCount: (a.readCount || 0) + 1 } : a));
    if (unreadCount > 0) setUnreadCount((c) => c - 1);
    markAsRead(id).catch(() => {});
  };

  const handleMarkAllRead = async () => {
    setAnnouncements((p) => p.map((a) => ({ ...a, isRead: true })));
    setUnreadCount(0);
    await markAllAsRead().catch(() => {});
  };

  const handleDelete = async (id) => {
    const a = announcements.find((x) => x._id === id);
    setAnnouncements((p) => p.filter((x) => x._id !== id));
    if (a && !a.isRead) setUnreadCount((c) => Math.max(0, c - 1));
    await deleteAnnouncement(id).catch(() => {});
  };

  const handlePin = async (id) => {
    try {
      const res = await togglePin(id);
      setAnnouncements((p) =>
        p.map((a) => a._id === id ? { ...a, isPinned: res.data.data.isPinned } : a)
          .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0))
      );
    } catch (_) {}
  };

  const hasActiveFilters = search || dateFrom || dateTo || scopeFilter !== "all";

  if (detailId) return <DetailView id={detailId} currentUser={user} onBack={() => setDetailId(null)} />;

  return (
    <div style={{ paddingBottom: 80, fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        textarea:focus, input:focus, select:focus { outline: none; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideIn { from{opacity:0;transform:translateY(-8px);} to{opacity:1;transform:translateY(0);} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .ann-new { animation: slideIn 0.3s ease forwards; }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <h1 style={s.pageTitle}>Announcements</h1>
          {unreadCount > 0 && <span style={s.unreadBadge}>{unreadCount} new</span>}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {unreadCount > 0 && <button onClick={handleMarkAllRead} style={s.markAllBtn}>✓ Mark all read</button>}
          {canPost && <button onClick={() => setShowCreate(true)} style={s.postBtn}>📢 Post</button>}
        </div>
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 10 }}>
        <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 16, pointerEvents: "none" }}>🔍</span>
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search announcements..." style={{ ...s.searchInput, paddingLeft: 42 }} />
        <button onClick={() => setShowFilters((p) => !p)}
          style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: hasActiveFilters ? "#EFF6FF" : "none", border: hasActiveFilters ? "1px solid #BFDBFE" : "none", borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600, color: hasActiveFilters ? "#2563EB" : "#64748B", fontFamily: "'DM Sans', sans-serif" }}>
          🎛️ Filters {hasActiveFilters && "●"}
        </button>
      </div>

      {/* Date filters */}
      {showFilters && (
        <div style={{ background: "#F8FAFC", borderRadius: 12, padding: "14px 16px", marginBottom: 12, border: "1px solid #E2E8F0", display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: 1, minWidth: 120 }}>
            <label style={{ ...s.label, marginBottom: 4 }}>From date</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={s.input} />
          </div>
          <div style={{ flex: 1, minWidth: 120 }}>
            <label style={{ ...s.label, marginBottom: 4 }}>To date</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={s.input} />
          </div>
          {(dateFrom || dateTo || search) && (
            <button onClick={() => { setSearch(""); setDateFrom(""); setDateTo(""); }}
              style={{ padding: "9px 14px", borderRadius: 10, border: "1.5px solid #FECACA", background: "#FEF2F2", color: "#DC2626", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" }}>
              ✕ Clear filters
            </button>
          )}
        </div>
      )}

      {/* Scope tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {[
          { id: "all", label: "📋 All" }, { id: "university", label: "🏛️ University" },
          { id: "faculty", label: "🏫 Faculty" }, { id: "department", label: "📚 Department" },
          { id: "level", label: "🎓 Level" },
        ].map((f) => (
          <button key={f.id} onClick={() => setScopeFilter(f.id)}
            style={{ ...s.filterBtn, ...(scopeFilter === f.id ? s.filterActive : {}) }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Skeletons */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ ...s.card, padding: 20 }}>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#E2E8F0", flexShrink: 0, animation: "pulse 1.5s ease infinite" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ height: 13, background: "#E2E8F0", borderRadius: 6, width: "40%", marginBottom: 8, animation: "pulse 1.5s ease infinite" }} />
                  <div style={{ height: 18, background: "#E2E8F0", borderRadius: 6, width: "75%", marginBottom: 8, animation: "pulse 1.5s ease infinite" }} />
                  <div style={{ height: 13, background: "#E2E8F0", borderRadius: 6, width: "100%", animation: "pulse 1.5s ease infinite" }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List */}
      {!loading && (
        announcements.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 20px" }}>
            <span style={{ fontSize: 52, display: "block", marginBottom: 16 }}>📢</span>
            <h3 style={{ fontFamily: "Geist, sans-serif", fontWeight: 700, fontSize: 20, color: "#0F172A", marginBottom: 8 }}>
              {hasActiveFilters ? "No matching announcements" : "No announcements yet"}
            </h3>
            <p style={{ fontSize: 14, color: "#64748B", lineHeight: 1.6, maxWidth: 300, margin: "0 auto" }}>
              {hasActiveFilters ? "Try adjusting your search or filters." : "University, faculty, and department announcements will appear here."}
            </p>
            {hasActiveFilters && (
              <button onClick={() => { setSearch(""); setDateFrom(""); setDateTo(""); setScopeFilter("all"); }}
                style={{ ...s.postBtn, marginTop: 16, background: "#F1F5F9", color: "#374151", boxShadow: "none" }}>
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {announcements.map((a, i) => (
              <div key={a._id} className={i === 0 ? "ann-new" : ""}>
                <AnnouncementCard
                  announcement={a} currentUser={user}
                  onRead={handleRead} onDelete={handleDelete}
                  onPin={handlePin} onOpen={(id) => setDetailId(id)}
                />
              </div>
            ))}
            {hasMore && (
              <button onClick={() => load(page + 1)} disabled={loadingMore} style={s.loadMoreBtn}>
                {loadingMore
                  ? <span style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                      <div style={{ width: 16, height: 16, border: "2px solid #E2E8F0", borderTopColor: "#2563EB", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                      Loading...
                    </span>
                  : "Load more"
                }
              </button>
            )}
          </div>
        )
      )}

      {showCreate && (
        <CreateModal user={user} onClose={() => setShowCreate(false)}
          onCreated={(a) => setAnnouncements((p) => [a, ...p])} />
      )}
    </div>
  );
};

// ─── Styles ───────────────────────────────────────────────
const s = {
  pageTitle:    { fontFamily: "Geist, sans-serif", fontWeight: 800, fontSize: 26, color: "#0F172A", margin: 0 },
  unreadBadge:  { display: "inline-block", background: "linear-gradient(135deg, #1D4ED8, #3B82F6)", color: "white", borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700, marginTop: 4 },
  markAllBtn:   { padding: "7px 12px", borderRadius: 8, border: "none", background: "#EFF6FF", color: "#2563EB", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" },
  postBtn:      { padding: "8px 18px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #1D4ED8, #3B82F6)", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "Geist, sans-serif", boxShadow: "0 3px 10px rgba(37,99,235,0.3)", whiteSpace: "nowrap" },
  searchInput:  { width: "100%", padding: "11px 52px 11px 42px", border: "1.5px solid #E2E8F0", borderRadius: 12, fontSize: 14, color: "#0F172A", background: "white", fontFamily: "'DM Sans', sans-serif", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" },
  filterBtn:    { padding: "6px 14px", borderRadius: 20, border: "1.5px solid #E2E8F0", background: "white", fontSize: 12, fontWeight: 600, color: "#64748B", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s", whiteSpace: "nowrap" },
  filterActive: { background: "#0F172A", borderColor: "#0F172A", color: "white" },
  card:         { borderRadius: 16, padding: 18, border: "1px solid #E2E8F0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", transition: "box-shadow 0.2s" },
  urgentBanner: { background: "#FEF2F2", color: "#DC2626", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 800, marginBottom: 10, fontFamily: "Geist, sans-serif", textAlign: "center", border: "1px solid #FECACA" },
  pinnedTag:    { fontSize: 11, color: "#D97706", background: "#FFFBEB", borderRadius: 20, padding: "2px 10px", display: "inline-block", marginBottom: 8, fontWeight: 600, border: "1px solid #FDE68A" },
  authorName:   { fontFamily: "Geist, sans-serif", fontWeight: 700, fontSize: 14, color: "#0F172A" },
  rolePill:     { fontSize: 10, background: "#F1F5F9", color: "#64748B", borderRadius: 20, padding: "1px 8px", fontWeight: 600, textTransform: "capitalize" },
  unreadDot:    { width: 8, height: 8, borderRadius: "50%", background: "#2563EB", flexShrink: 0 },
  scopeBadge:   { fontSize: 11, fontWeight: 600, borderRadius: 20, padding: "2px 10px" },
  targetTag:    { fontSize: 11, color: "#64748B", background: "#F1F5F9", borderRadius: 20, padding: "2px 8px", fontWeight: 500 },
  timeText:     { fontSize: 11, color: "#94A3B8" },
  iconBtn:      { background: "none", border: "none", cursor: "pointer", fontSize: 16, padding: "4px 6px", borderRadius: 8 },
  shareBtn:     { padding: "6px 14px", borderRadius: 8, border: "1.5px solid #E2E8F0", background: "white", fontSize: 12, fontWeight: 700, cursor: "pointer", color: "#374151", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap", flexShrink: 0 },
  cardTitle:    { fontFamily: "Geist, sans-serif", fontWeight: 700, fontSize: 16, color: "#0F172A", margin: "0 0 6px", lineHeight: 1.4 },
  mediaImg:     { width: "100%", objectFit: "cover", borderRadius: 12, marginBottom: 10, display: "block" },
  attachment:   { display: "inline-flex", alignItems: "center", gap: 8, background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: "8px 14px", marginBottom: 10 },
  cardFooter:   { display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTop: "1px solid #F1F5F9", marginTop: 4 },
  loadMoreBtn:  { width: "100%", padding: 12, border: "1.5px solid #E2E8F0", borderRadius: 12, background: "white", fontSize: 13, fontWeight: 600, color: "#374151", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  backBtn:      { background: "none", border: "none", color: "#2563EB", fontSize: 14, fontWeight: 600, cursor: "pointer", padding: "0 0 16px", fontFamily: "'DM Sans', sans-serif", display: "block" },
  commentsSection:      { background: "white", borderRadius: 16, padding: 18, border: "1px solid #E2E8F0", marginTop: 12 },
  commentsSectionTitle: { fontFamily: "Geist, sans-serif", fontWeight: 700, fontSize: 14, color: "#0F172A", marginBottom: 14 },
  commentRow:    { display: "flex", gap: 10, alignItems: "flex-start" },
  commentBubble: { background: "#F8FAFC", borderRadius: 12, padding: "8px 12px", flex: 1, minWidth: 0 },
  commentAuthor: { fontFamily: "Geist, sans-serif", fontWeight: 700, fontSize: 12, color: "#0F172A" },
  commentText:   { fontSize: 13.5, color: "#374151", lineHeight: 1.5, marginTop: 3 },
  commentTime:   { fontSize: 11, color: "#94A3B8", marginTop: 4 },
  commentInput:  { flex: 1, padding: "8px 14px", border: "1.5px solid #E2E8F0", borderRadius: 20, fontSize: 13, background: "#F8FAFC", color: "#0F172A", fontFamily: "'DM Sans', sans-serif" },
  commentSend:   { width: 34, height: 34, borderRadius: "50%", background: "#2563EB", color: "white", border: "none", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  overlay:       { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 },
  modal:         { background: "white", borderRadius: 20, width: "100%", maxWidth: 520, boxShadow: "0 24px 80px rgba(0,0,0,0.2)", overflow: "hidden" },
  modalHeader:   { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 24px", borderBottom: "1px solid #F1F5F9" },
  modalTitle:    { fontFamily: "Geist, sans-serif", fontWeight: 700, fontSize: 17, color: "#0F172A", margin: 0 },
  closeBtn:      { background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#94A3B8" },
  label:         { display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 5 },
  input:         { width: "100%", padding: "10px 12px", border: "1.5px solid #E2E8F0", borderRadius: 10, fontSize: 14, color: "#0F172A", background: "#F8FAFC", fontFamily: "'DM Sans', sans-serif" },
  select:        { width: "100%", padding: "10px 12px", border: "1.5px solid #E2E8F0", borderRadius: 10, fontSize: 14, color: "#0F172A", background: "#F8FAFC", fontFamily: "'DM Sans', sans-serif" },
  cancelBtn:     { padding: "9px 20px", border: "1.5px solid #E2E8F0", borderRadius: 10, background: "white", fontSize: 14, fontWeight: 600, cursor: "pointer", color: "#374151", fontFamily: "Geist, sans-serif" },
  errorBanner:   { background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#DC2626" },
  spinner:       { width: 28, height: 28, border: "3px solid #E2E8F0", borderTopColor: "#2563EB", borderRadius: "50%", animation: "spin 0.7s linear infinite" },
};

export default AnnouncementsPage;
