import { useState, useEffect, useRef } from 'react';
import useIsMobile from '../../hooks/useIsMobile';
import useAuthStore from '../../context/useAuthStore';
import {
  getCourses, getMyCourses, getSuggestedCourses,
  getCourse, createCourse, toggleJoin,
  getResources, uploadResource, toggleResourceLike,
  deleteResource, incrementDownload,
  getDiscussions, postDiscussion,
} from '../../services/coursesService';
import { toggleLike, addComment, getComments } from '../../services/postsService';

// ── Helpers ────────────────────────────────────────────────
const timeAgo = (date) => {
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
};

const formatFileSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const RESOURCE_TYPES = [
  { id: 'all',           label: '📂 All',            color: '#64748B' },
  { id: 'past_question', label: '📝 Past Questions',  color: '#EF4444' },
  { id: 'lecture_note',  label: '📖 Lecture Notes',   color: '#2563EB' },
  { id: 'exam_tip',      label: '💡 Exam Tips',       color: '#D97706' },
  { id: 'textbook',      label: '📚 Textbooks',       color: '#7C3AED' },
  { id: 'assignment',    label: '✏️ Assignments',     color: '#059669' },
  { id: 'other',         label: '📌 Other',           color: '#94A3B8' },
];

const RESOURCE_ICONS = {
  past_question: '📝',
  lecture_note:  '📖',
  exam_tip:      '💡',
  textbook:      '📚',
  assignment:    '✏️',
  other:         '📌',
};

const LEVELS = ['100', '200', '300', '400', '500'];

// ── Avatar ─────────────────────────────────────────────────
const Avatar = ({ user, size = 36 }) => {
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

// ── Course Card ────────────────────────────────────────────
const CourseCard = ({ course, onClick }) => (
  <div onClick={() => onClick(course)} style={s.courseCard}
    onMouseEnter={e => e.currentTarget.style.borderColor = '#2563EB'}
    onMouseLeave={e => e.currentTarget.style.borderColor = '#E2E8F0'}
  >
    <div style={s.courseCardTop}>
      <div style={s.courseCode}>{course.courseCode}</div>
      <div style={{ ...s.levelBadge, background: course.isJoined ? '#DCFCE7' : '#F1F5F9', color: course.isJoined ? '#16A34A' : '#64748B' }}>
        {course.isJoined ? '✓ Joined' : `${course.level}L`}
      </div>
    </div>
    <div style={s.courseTitle}>{course.courseTitle}</div>
    <div style={s.courseMeta}>{course.department}</div>
    <div style={s.courseStats}>
      <span>👥 {course.membersCount} members</span>
      <span>📅 {course.semester === 'first' ? '1st' : '2nd'} Semester</span>
    </div>
  </div>
);

// ── Resource Card ──────────────────────────────────────────
const ResourceCard = ({ resource, courseId, currentUserId, onDelete }) => {
  const [liked, setLiked] = useState(resource.isLiked);
  const [likeCount, setLikeCount] = useState(resource.likesCount);
  const isOwner = resource.uploadedBy?._id?.toString() === currentUserId?.toString();

  const handleLike = async (e) => {
    e.stopPropagation();
    setLiked(p => !p);
    setLikeCount(p => liked ? p - 1 : p + 1);
    try { await toggleResourceLike(courseId, resource._id); }
    catch { setLiked(p => !p); setLikeCount(p => liked ? p + 1 : p - 1); }
  };

  const handleDownload = async () => {
    window.open(resource.fileUrl, '_blank');
    await incrementDownload(courseId, resource._id).catch(() => {});
  };

  const isPDF = resource.fileType === 'application/pdf';

  return (
    <div style={s.resourceCard}>
      <div style={s.resourceLeft}>
        <div style={{ ...s.resourceIcon, background: '#F1F5F9' }}>
          {RESOURCE_ICONS[resource.resourceType] || '📌'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={s.resourceTitle}>{resource.title}</div>
          {resource.description && <div style={s.resourceDesc}>{resource.description}</div>}
          <div style={s.resourceMeta}>
            <Avatar user={resource.uploadedBy} size={18} />
            <span>{resource.uploadedBy?.fullName}</span>
            {resource.academicYear && <span style={s.yearBadge}>📅 {resource.academicYear}</span>}
            <span style={{ color: '#CBD5E1' }}>·</span>
            <span>{timeAgo(resource.createdAt)}</span>
            {resource.fileSize > 0 && <span style={{ color: '#CBD5E1' }}>· {formatFileSize(resource.fileSize)}</span>}
          </div>
        </div>
      </div>
      <div style={s.resourceActions}>
        <button onClick={handleLike} style={{ ...s.resourceBtn, color: liked ? '#EF4444' : '#94A3B8' }}>
          {liked ? '❤️' : '🤍'} {likeCount}
        </button>
        <span style={{ fontSize: 11, color: '#94A3B8' }}>⬇️ {resource.downloadsCount}</span>
        <button onClick={handleDownload} style={{ ...s.resourceBtn, background: '#EFF6FF', color: '#2563EB', fontWeight: 700 }}>
          {isPDF ? '📄 View' : '⬇️ Download'}
        </button>
        {isOwner && (
          <button onClick={() => onDelete(resource._id)} style={{ ...s.resourceBtn, color: '#EF4444' }}>
            🗑️
          </button>
        )}
      </div>
    </div>
  );
};

// ── Discussion Post ────────────────────────────────────────
const DiscussionPost = ({ post, currentUserId }) => {
  const [liked, setLiked] = useState(post.isLiked);
  const [likeCount, setLikeCount] = useState(post.likesCount);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleLike = async () => {
    setLiked(p => !p);
    setLikeCount(p => liked ? p - 1 : p + 1);
    try { await toggleLike(post._id); }
    catch { setLiked(p => !p); setLikeCount(p => liked ? p + 1 : p - 1); }
  };

  const handleToggleComments = async () => {
    setShowComments(p => !p);
    if (!showComments && comments.length === 0) {
      try {
        const res = await getComments(post._id);
        setComments(res.data.data.comments);
      } catch (_) {}
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await addComment(post._id, commentText.trim());
      setComments(p => [...p, res.data.data.comment]);
      setCommentText('');
    } catch (_) {}
    setSubmitting(false);
  };

  return (
    <div style={s.discussionPost}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
        <Avatar user={post.author} size={38} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={s.postAuthor}>{post.author?.fullName}</span>
            {post.author?.role === 'lecturer' && <span style={s.lecturerBadge}>👨‍🏫 Lecturer</span>}
            {post.author?.role === 'course_rep' && <span style={s.repBadge}>🎓 Course Rep</span>}
          </div>
          <div style={s.postMeta}>{post.author?.department} · {timeAgo(post.createdAt)}</div>
        </div>
      </div>
      <p style={s.postContent}>{post.content}</p>
      {post.tags?.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          {post.tags.map(t => <span key={t} style={s.tag}>#{t}</span>)}
        </div>
      )}
      <div style={s.postActions}>
        <button onClick={handleLike} style={{ ...s.actionBtn, color: liked ? '#EF4444' : '#64748B', background: liked ? '#FEF2F2' : 'transparent' }}>
          {liked ? '❤️' : '🤍'} {likeCount}
        </button>
        <button onClick={handleToggleComments} style={s.actionBtn}>
          💬 {post.commentsCount}
        </button>
      </div>
      {showComments && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #F1F5F9' }}>
          {comments.map(c => (
            <div key={c._id} style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <Avatar user={c.author} size={28} />
              <div style={{ background: '#F8FAFC', borderRadius: 12, padding: '7px 12px', flex: 1 }}>
                <div style={{ fontFamily: 'Geist, sans-serif', fontWeight: 700, fontSize: 12, color: '#0F172A', marginBottom: 2 }}>{c.author?.fullName}</div>
                <div style={{ fontSize: 13, color: '#374151' }}>{c.content}</div>
              </div>
            </div>
          ))}
          <form onSubmit={handleComment} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input value={commentText} onChange={e => setCommentText(e.target.value)}
              placeholder="Add to discussion..." style={s.commentInput} />
            <button type="submit" disabled={!commentText.trim() || submitting}
              style={s.commentSend}>→</button>
          </form>
        </div>
      )}
    </div>
  );
};

// ── Upload Resource Modal ──────────────────────────────────
const UploadModal = ({ courseId, onClose, onUploaded }) => {
  const [form, setForm] = useState({ title: '', description: '', resourceType: 'lecture_note', academicYear: '' });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { setError('Please select a file.'); return; }
    if (!form.title.trim()) { setError('Title is required.'); return; }
    setUploading(true); setError('');
    try {
      const fd = new FormData();
      fd.append('document', file);
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      const res = await uploadResource(courseId, fd);
      onUploaded(res.data.data.resource);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed.');
    }
    setUploading(false);
  };

  return (
    <div style={s.modalOverlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        <div style={s.modalHeader}>
          <h3 style={s.modalTitle}>Upload Resource</h3>
          <button onClick={onClose} style={s.closeBtn}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* File picker */}
          <div>
            <label style={s.label}>File (PDF or Image)</label>
            <div onClick={() => fileRef.current?.click()}
              style={{ border: '2px dashed #E2E8F0', borderRadius: 12, padding: '20px', textAlign: 'center', cursor: 'pointer', background: '#F8FAFC', marginTop: 4 }}>
              {file
                ? <span style={{ fontSize: 13, fontWeight: 600, color: '#2563EB' }}>📎 {file.name}</span>
                : <><span style={{ fontSize: 24 }}>📁</span><br/><span style={{ fontSize: 13, color: '#94A3B8' }}>Click to select a file</span></>
              }
            </div>
            <input ref={fileRef} type="file" accept=".pdf,image/*" onChange={e => { setFile(e.target.files[0]); setError(''); }} style={{ display: 'none' }} />
          </div>

          {/* Type */}
          <div>
            <label style={s.label}>Resource Type</label>
            <select value={form.resourceType} onChange={e => setForm(p => ({ ...p, resourceType: e.target.value }))} style={s.select}>
              <option value="past_question">📝 Past Question</option>
              <option value="lecture_note">📖 Lecture Note</option>
              <option value="exam_tip">💡 Exam Tip</option>
              <option value="textbook">📚 Textbook</option>
              <option value="assignment">✏️ Assignment</option>
              <option value="other">📌 Other</option>
            </select>
          </div>

          {/* Title */}
          <div>
            <label style={s.label}>Title</label>
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="e.g. 2022/2023 Past Questions" style={s.input} />
          </div>

          {/* Academic year (for past questions) */}
          {form.resourceType === 'past_question' && (
            <div>
              <label style={s.label}>Academic Year</label>
              <input value={form.academicYear} onChange={e => setForm(p => ({ ...p, academicYear: e.target.value }))}
                placeholder="e.g. 2022/2023" style={s.input} />
            </div>
          )}

          {/* Description */}
          <div>
            <label style={s.label}>Description (optional)</label>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Add a brief description..." style={{ ...s.input, height: 72, resize: 'none' }} />
          </div>

          {error && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#DC2626' }}>⚠️ {error}</div>}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={s.cancelBtn}>Cancel</button>
            <button type="submit" disabled={uploading} style={{ ...s.saveBtn, opacity: uploading ? 0.7 : 1 }}>
              {uploading ? 'Uploading...' : '📤 Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Create Course Modal ────────────────────────────────────
const CreateCourseModal = ({ onClose, onCreate }) => {
  const { user } = useAuthStore();
  const [form, setForm] = useState({
    courseCode: '', courseTitle: '', level: '100', semester: 'first',
    units: '2', description: '',
    faculty: user?.faculty || '',
    department: user?.department || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await createCourse({ ...form, units: parseInt(form.units) });
      onCreate(res.data.data.course);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create course.');
    }
    setLoading(false);
  };

  return (
    <div style={s.modalOverlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        <div style={s.modalHeader}>
          <h3 style={s.modalTitle}>Create Course Hub</h3>
          <button onClick={onClose} style={s.closeBtn}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={s.label}>Course Code *</label>
              <input value={form.courseCode} onChange={e => setForm(p => ({ ...p, courseCode: e.target.value.toUpperCase() }))}
                placeholder="e.g. CSC 201" style={s.input} required />
            </div>
            <div>
              <label style={s.label}>Units</label>
              <input type="number" min="1" max="6" value={form.units} onChange={e => setForm(p => ({ ...p, units: e.target.value }))} style={s.input} />
            </div>
          </div>
          <div>
            <label style={s.label}>Course Title *</label>
            <input value={form.courseTitle} onChange={e => setForm(p => ({ ...p, courseTitle: e.target.value }))}
              placeholder="e.g. Data Structures and Algorithms" style={s.input} required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={s.label}>Level</label>
              <select value={form.level} onChange={e => setForm(p => ({ ...p, level: e.target.value }))} style={s.select}>
                {LEVELS.map(l => <option key={l} value={l}>{l} Level</option>)}
              </select>
            </div>
            <div>
              <label style={s.label}>Semester</label>
              <select value={form.semester} onChange={e => setForm(p => ({ ...p, semester: e.target.value }))} style={s.select}>
                <option value="first">First Semester</option>
                <option value="second">Second Semester</option>
              </select>
            </div>
          </div>
          <div>
            <label style={s.label}>Department</label>
            <input value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))} style={s.input} />
          </div>
          <div>
            <label style={s.label}>Description (optional)</label>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Brief course description..." style={{ ...s.input, height: 72, resize: 'none' }} />
          </div>
          {error && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#DC2626' }}>⚠️ {error}</div>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={s.cancelBtn}>Cancel</button>
            <button type="submit" disabled={loading} style={{ ...s.saveBtn, opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Creating...' : '🎓 Create Hub'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Course Hub Detail View ─────────────────────────────────
const CourseHubView = ({ courseId, onBack, currentUser }) => {
  const isMobile = useIsMobile();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('discussions');
  const [resources, setResources] = useState([]);
  const [discussions, setDiscussions] = useState([]);
  const [resourceFilter, setResourceFilter] = useState('all');
  const [showUpload, setShowUpload] = useState(false);
  const [joined, setJoined] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [newPost, setNewPost] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [courseRes, discRes, resRes] = await Promise.all([
          getCourse(courseId),
          getDiscussions(courseId),
          getResources(courseId),
        ]);
        setCourse(courseRes.data.data.course);
        setJoined(courseRes.data.data.course.isJoined);
        setDiscussions(discRes.data.data.posts);
        setResources(resRes.data.data.resources);
      } catch (_) {}
      setLoading(false);
    };
    load();
  }, [courseId]);

  const handleJoin = async () => {
    setJoinLoading(true);
    setJoined(p => !p);
    try { await toggleJoin(courseId); }
    catch { setJoined(p => !p); }
    setJoinLoading(false);
  };

  const handlePost = async (e) => {
    e.preventDefault();
    if (!newPost.trim() || posting) return;
    setPosting(true);
    try {
      const res = await postDiscussion(courseId, { content: newPost.trim() });
      setDiscussions(p => [res.data.data.post, ...p]);
      setNewPost('');
    } catch (_) {}
    setPosting(false);
  };

  const handleDeleteResource = async (resourceId) => {
    try {
      await deleteResource(courseId, resourceId);
      setResources(p => p.filter(r => r._id !== resourceId));
    } catch (_) {}
  };

  const filteredResources = resourceFilter === 'all'
    ? resources
    : resources.filter(r => r.resourceType === resourceFilter);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
      <div style={s.spinner} />
    </div>
  );

  if (!course) return null;

  return (
    <div style={s.hubView}>
      {/* Back + Header */}
      <button onClick={onBack} style={s.backBtn}>← All Courses</button>

      <div style={{ ...s.hubHeader, flexDirection: isMobile ? 'column' : 'row' }}>
        <div style={{ ...s.hubHeaderLeft, flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 10 : 16 }}>
          <div style={{ ...s.hubCode, fontSize: isMobile ? 20 : 28, padding: isMobile ? '6px 12px' : '8px 16px' }}>{course.courseCode}</div>
          <div>
            <h2 style={s.hubTitle}>{course.courseTitle}</h2>
            <div style={s.hubMeta}>{course.department} · {course.level} Level · {course.semester === 'first' ? '1st' : '2nd'} Semester · {course.units} Units</div>
            {course.description && <p style={{ fontSize: 13, color: '#64748B', marginTop: 6, lineHeight: 1.5 }}>{course.description}</p>}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
          <button onClick={handleJoin} disabled={joinLoading}
            style={{ ...s.joinBtn, ...(joined ? s.joinedBtn : {}) }}>
            {joined ? '✓ Joined' : '+ Join Hub'}
          </button>
          <div style={{ fontSize: 12, color: '#94A3B8' }}>👥 {course.membersCount} members</div>
        </div>
      </div>

      {/* Resource counts row */}
      <div style={s.countsRow}>
        {Object.entries(course.resourceCounts || {}).map(([type, count]) => (
          <div key={type} style={s.countBadge}>
            {RESOURCE_ICONS[type]} {count} {type.replace('_', ' ')}
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={s.tabs}>
        {[
          { id: 'discussions', label: '💬 Discussions' },
          { id: 'resources',   label: '📂 Resources' },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{ ...s.tab, ...(activeTab === t.id ? s.tabActive : {}) }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── DISCUSSIONS ── */}
      {activeTab === 'discussions' && (
        <div>
          {/* Post composer */}
          <form onSubmit={handlePost} style={s.postComposer}>
            <Avatar user={currentUser} size={36} />
            <div style={{ flex: 1 }}>
              <textarea
                value={newPost}
                onChange={e => setNewPost(e.target.value)}
                placeholder={`Ask a question or share something about ${course.courseCode}...`}
                style={s.composerInput}
                rows={2}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <button type="submit" disabled={!newPost.trim() || posting}
                  style={{ ...s.saveBtn, opacity: newPost.trim() && !posting ? 1 : 0.5, padding: '7px 20px' }}>
                  {posting ? 'Posting...' : 'Post'}
                </button>
              </div>
            </div>
          </form>

          {discussions.length === 0 ? (
            <div style={s.emptyState}>
              <span style={{ fontSize: 40 }}>💬</span>
              <p style={{ color: '#64748B', fontSize: 14, marginTop: 10 }}>No discussions yet. Start the conversation!</p>
            </div>
          ) : (
            discussions.map(post => (
              <DiscussionPost key={post._id} post={post} currentUserId={currentUser?._id} />
            ))
          )}
        </div>
      )}

      {/* ── RESOURCES ── */}
      {activeTab === 'resources' && (
        <div>
          {/* Filter + upload */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {RESOURCE_TYPES.map(t => (
                <button key={t.id} onClick={() => setResourceFilter(t.id)}
                  style={{ ...s.filterBtn, ...(resourceFilter === t.id ? { background: '#0F172A', color: 'white', borderColor: '#0F172A' } : {}) }}>
                  {t.label}
                </button>
              ))}
            </div>
            <button onClick={() => setShowUpload(true)} style={s.saveBtn}>
              📤 Upload
            </button>
          </div>

          {filteredResources.length === 0 ? (
            <div style={s.emptyState}>
              <span style={{ fontSize: 40 }}>📂</span>
              <p style={{ color: '#64748B', fontSize: 14, marginTop: 10 }}>
                No {resourceFilter === 'all' ? '' : resourceFilter.replace('_', ' ')} resources yet.
              </p>
              <button onClick={() => setShowUpload(true)} style={{ ...s.saveBtn, marginTop: 12 }}>
                Be the first to upload
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filteredResources.map(r => (
                <ResourceCard
                  key={r._id}
                  resource={r}
                  courseId={courseId}
                  currentUserId={currentUser?._id}
                  onDelete={handleDeleteResource}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {showUpload && (
        <UploadModal
          courseId={courseId}
          onClose={() => setShowUpload(false)}
          onUploaded={r => setResources(p => [r, ...p])}
        />
      )}
    </div>
  );
};

// ── Main Courses Page ──────────────────────────────────────
const CoursesPage = () => {
  const { user } = useAuthStore();
  const [view, setView] = useState('discover'); // discover | mine
  const [activeCourseId, setActiveCourseId] = useState(null);
  const [courses, setCourses] = useState([]);
  const [myCourses, setMyCourses] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const loadCourses = async () => {
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (levelFilter) params.level = levelFilter;
      const [allRes, myRes, suggestRes] = await Promise.all([
        getCourses(params),
        getMyCourses(),
        getSuggestedCourses(),
      ]);
      setCourses(allRes.data.data.courses);
      setMyCourses(myRes.data.data.courses);
      setSuggestions(suggestRes.data.data.courses);
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => { loadCourses(); }, [search, levelFilter]);

  if (activeCourseId) return (
    <CourseHubView
      courseId={activeCourseId}
      currentUser={user}
      onBack={() => { setActiveCourseId(null); loadCourses(); }}
    />
  );

  return (
    <div style={s.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        textarea:focus, input:focus, select:focus { outline: none; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={s.pageTitle}>Course Hubs</h1>
          <p style={s.pageSubtitle}>Your academic collaboration space 🎓</p>
        </div>
        <button onClick={() => setShowCreate(true)} style={s.saveBtn}>+ New Hub</button>
      </div>

      {/* View toggle */}
      <div style={s.viewToggle}>
        {[['discover', '🔍 Discover'], ['mine', `📚 My Courses (${myCourses.length})`]].map(([v, label]) => (
          <button key={v} onClick={() => setView(v)}
            style={{ ...s.toggleBtn, ...(view === v ? s.toggleActive : {}) }}>
            {label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 15 }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search courses..." style={{ ...s.searchInput, paddingLeft: 38 }} />
        </div>
        <select value={levelFilter} onChange={e => setLevelFilter(e.target.value)} style={s.select}>
          <option value="">All Levels</option>
          {LEVELS.map(l => <option key={l} value={l}>{l} Level</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div style={s.spinner} />
        </div>
      ) : (
        <>
          {view === 'discover' && (
            <>
              {/* Suggestions */}
              {suggestions.length > 0 && !search && !levelFilter && (
                <div style={{ marginBottom: 24 }}>
                  <div style={s.sectionTitle}>⚡ Suggested for you</div>
                  <div style={s.courseGrid}>
                    {suggestions.map(c => (
                      <CourseCard key={c._id} course={c} onClick={c => setActiveCourseId(c._id)} />
                    ))}
                  </div>
                </div>
              )}

              <div style={s.sectionTitle}>
                {search || levelFilter ? `Results (${courses.length})` : 'All Course Hubs'}
              </div>
              {courses.length === 0 ? (
                <div style={s.emptyState}>
                  <span style={{ fontSize: 48 }}>📚</span>
                  <p style={{ color: '#64748B', fontSize: 14, marginTop: 12 }}>
                    No courses found. Create one!
                  </p>
                  <button onClick={() => setShowCreate(true)} style={{ ...s.saveBtn, marginTop: 12 }}>
                    + Create Course Hub
                  </button>
                </div>
              ) : (
                <div style={s.courseGrid}>
                  {courses.map(c => (
                    <CourseCard key={c._id} course={c} onClick={c => setActiveCourseId(c._id)} />
                  ))}
                </div>
              )}
            </>
          )}

          {view === 'mine' && (
            <>
              {myCourses.length === 0 ? (
                <div style={s.emptyState}>
                  <span style={{ fontSize: 48 }}>📖</span>
                  <h3 style={{ fontFamily: 'Geist, sans-serif', fontWeight: 700, fontSize: 18, color: '#0F172A', margin: '12px 0 8px' }}>
                    No courses joined yet
                  </h3>
                  <p style={{ color: '#64748B', fontSize: 14, marginBottom: 16 }}>
                    Join course hubs to access past questions, notes, and discussions.
                  </p>
                  <button onClick={() => setView('discover')} style={s.saveBtn}>
                    Discover Courses
                  </button>
                </div>
              ) : (
                <div style={s.courseGrid}>
                  {myCourses.map(c => (
                    <CourseCard key={c._id} course={c} onClick={c => setActiveCourseId(c._id)} />
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {showCreate && (
        <CreateCourseModal
          onClose={() => setShowCreate(false)}
          onCreate={c => { setMyCourses(p => [c, ...p]); setView('mine'); }}
        />
      )}
    </div>
  );
};

// ─── Styles ───────────────────────────────────────────────
const s = {
  page: { paddingBottom: 80, fontFamily: "'DM Sans', sans-serif" },
  pageTitle: { fontFamily: 'Geist, sans-serif', fontWeight: 800, fontSize: 26, color: '#0F172A', margin: 0 },
  pageSubtitle: { fontSize: 14, color: '#64748B', marginTop: 4 },

  viewToggle: { display: 'flex', gap: 6, marginBottom: 16, background: 'white', padding: 5, borderRadius: 12, border: '1px solid #E2E8F0' },
  toggleBtn: { flex: 1, padding: '8px', borderRadius: 8, border: 'none', background: 'transparent', fontSize: 13, fontWeight: 600, color: '#64748B', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'all 0.15s' },
  toggleActive: { background: '#0F172A', color: 'white' },

  searchInput: { width: '100%', padding: '9px 12px', border: '1.5px solid #E2E8F0', borderRadius: 12, fontSize: 13, color: '#0F172A', background: '#F8FAFC', fontFamily: "'DM Sans', sans-serif" },

  sectionTitle: { fontFamily: 'Geist, sans-serif', fontWeight: 700, fontSize: 15, color: '#0F172A', marginBottom: 12 },

  courseGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12, marginBottom: 24 },
  courseCard: { background: 'white', borderRadius: 16, padding: 16, border: '1px solid #E2E8F0', cursor: 'pointer', transition: 'border-color 0.2s, box-shadow 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
  courseCardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  courseCode: { fontFamily: 'Geist, sans-serif', fontWeight: 800, fontSize: 16, color: '#2563EB' },
  levelBadge: { fontSize: 11, fontWeight: 700, borderRadius: 20, padding: '2px 10px' },
  courseTitle: { fontFamily: 'Geist, sans-serif', fontWeight: 700, fontSize: 14, color: '#0F172A', marginBottom: 4, lineHeight: 1.3 },
  courseMeta: { fontSize: 12, color: '#94A3B8', marginBottom: 10 },
  courseStats: { display: 'flex', gap: 10, fontSize: 11, color: '#64748B', flexWrap: 'wrap' },

  // Hub view
  hubView: { paddingBottom: 80 },
  backBtn: { background: 'none', border: 'none', color: '#2563EB', fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: '0 0 16px', fontFamily: "'DM Sans', sans-serif" },
  hubHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: 'white', borderRadius: 16, padding: 20, border: '1px solid #E2E8F0', marginBottom: 12, gap: 16 },
  hubHeaderLeft: { display: 'flex', gap: 16, flex: 1, minWidth: 0 },
  hubCode: { fontFamily: 'Geist, sans-serif', fontWeight: 800, fontSize: 28, color: '#2563EB', background: '#EFF6FF', borderRadius: 12, padding: '8px 16px', flexShrink: 0, alignSelf: 'flex-start' },
  hubTitle: { fontFamily: 'Geist, sans-serif', fontWeight: 800, fontSize: 20, color: '#0F172A', margin: '0 0 4px' },
  hubMeta: { fontSize: 13, color: '#94A3B8' },
  joinBtn: { padding: '8px 20px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #1D4ED8, #3B82F6)', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Geist, sans-serif', boxShadow: '0 3px 10px rgba(37,99,235,0.3)' },
  joinedBtn: { background: '#F1F5F9', color: '#374151', boxShadow: 'none', border: '1.5px solid #E2E8F0' },

  countsRow: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 },
  countBadge: { fontSize: 12, fontWeight: 600, color: '#475569', background: '#F8FAFC', borderRadius: 20, padding: '4px 12px', border: '1px solid #E2E8F0' },

  tabs: { display: 'flex', gap: 4, marginBottom: 16, background: 'white', padding: 5, borderRadius: 12, border: '1px solid #E2E8F0' },
  tab: { flex: 1, padding: '8px', borderRadius: 8, border: 'none', background: 'transparent', fontSize: 13, fontWeight: 600, color: '#64748B', cursor: 'pointer', transition: 'all 0.15s', fontFamily: "'DM Sans', sans-serif" },
  tabActive: { background: '#0F172A', color: 'white' },

  // Post composer
  postComposer: { display: 'flex', gap: 12, background: 'white', borderRadius: 16, padding: 16, border: '1px solid #E2E8F0', marginBottom: 16 },
  composerInput: { width: '100%', border: '1.5px solid #E2E8F0', borderRadius: 12, padding: '10px 14px', fontSize: 14, color: '#0F172A', background: '#F8FAFC', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5 },

  // Discussion post
  discussionPost: { background: 'white', borderRadius: 16, padding: 16, border: '1px solid #E2E8F0', marginBottom: 10 },
  postAuthor: { fontFamily: 'Geist, sans-serif', fontWeight: 700, fontSize: 14, color: '#0F172A' },
  lecturerBadge: { fontSize: 11, background: '#FFFBEB', color: '#D97706', borderRadius: 20, padding: '2px 8px', fontWeight: 600 },
  repBadge: { fontSize: 11, background: '#EFF6FF', color: '#2563EB', borderRadius: 20, padding: '2px 8px', fontWeight: 600 },
  postMeta: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  postContent: { fontSize: 14.5, color: '#1E293B', lineHeight: 1.65, marginBottom: 10 },
  postActions: { display: 'flex', gap: 4, paddingTop: 10, borderTop: '1px solid #F1F5F9' },
  actionBtn: { display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 8, border: 'none', background: 'transparent', fontSize: 13, fontWeight: 600, color: '#64748B', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" },
  tag: { fontSize: 12, color: '#2563EB', background: '#EFF6FF', padding: '2px 8px', borderRadius: 20, fontWeight: 600 },
  commentInput: { flex: 1, padding: '8px 14px', border: '1.5px solid #E2E8F0', borderRadius: 20, fontSize: 13, background: '#F8FAFC', color: '#0F172A', fontFamily: "'DM Sans', sans-serif" },
  commentSend: { width: 34, height: 34, borderRadius: '50%', background: '#2563EB', color: 'white', border: 'none', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },

  // Resource card
  resourceCard: { background: 'white', borderRadius: 14, padding: '14px 16px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' },
  resourceLeft: { display: 'flex', gap: 12, flex: 1, minWidth: 0, alignItems: 'flex-start' },
  resourceIcon: { width: 42, height: 42, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 },
  resourceTitle: { fontFamily: 'Geist, sans-serif', fontWeight: 700, fontSize: 14, color: '#0F172A', marginBottom: 3 },
  resourceDesc: { fontSize: 12, color: '#64748B', marginBottom: 4, lineHeight: 1.4 },
  resourceMeta: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#94A3B8', flexWrap: 'wrap' },
  yearBadge: { background: '#F0FDF4', color: '#16A34A', borderRadius: 20, padding: '1px 8px', fontWeight: 600, fontSize: 11 },
  resourceActions: { display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 },
  resourceBtn: { padding: '6px 12px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 4 },

  filterBtn: { padding: '5px 12px', borderRadius: 20, border: '1.5px solid #E2E8F0', background: 'white', fontSize: 12, fontWeight: 600, color: '#64748B', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'all 0.15s', whiteSpace: 'nowrap' },

  emptyState: { textAlign: 'center', padding: '48px 20px' },

  // Modal
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 },
  modal: { background: 'white', borderRadius: 20, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.2)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid #F1F5F9' },
  modalTitle: { fontFamily: 'Geist, sans-serif', fontWeight: 700, fontSize: 17, color: '#0F172A', margin: 0 },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#94A3B8' },

  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 5 },
  input: { width: '100%', padding: '10px 12px', border: '1.5px solid #E2E8F0', borderRadius: 10, fontSize: 14, color: '#0F172A', background: '#F8FAFC', fontFamily: "'DM Sans', sans-serif" },
  select: { width: '100%', padding: '10px 12px', border: '1.5px solid #E2E8F0', borderRadius: 10, fontSize: 14, color: '#0F172A', background: '#F8FAFC', fontFamily: "'DM Sans', sans-serif", appearance: 'none' },
  cancelBtn: { padding: '9px 20px', border: '1.5px solid #E2E8F0', borderRadius: 10, background: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#374151', fontFamily: 'Geist, sans-serif' },
  saveBtn: { padding: '9px 20px', border: 'none', borderRadius: 10, background: 'linear-gradient(135deg, #1D4ED8, #3B82F6)', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Geist, sans-serif', boxShadow: '0 3px 10px rgba(37,99,235,0.3)', whiteSpace: 'nowrap' },

  spinner: { width: 28, height: 28, border: '3px solid #E2E8F0', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 0.7s linear infinite' },
};

export default CoursesPage;
