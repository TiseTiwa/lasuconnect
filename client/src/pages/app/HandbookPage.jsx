import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useIsMobile from '../../hooks/useIsMobile';
import useAuthStore from '../../context/useAuthStore';
import LCIcon from '../../components/LCIcon';
import {
  getHandbook, uploadHandbook, confirmCourses,
  updateCourse, deleteCourse,
} from '../../services/academicService';
import api from '../../services/api';

const addCourseAPI = (data) => api.post('/handbook/courses', data);

const SEMESTERS = ['first', 'second', 'both'];
const LEVELS    = ['100', '200', '300', '400', '500'];

const labelStyle = {
  fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600,
  display: 'block', marginBottom: 4,
};

// ── Add course modal ───────────────────────────────────────
const AddCourseModal = ({ onAdd, onClose }) => {
  const [form, setForm] = useState({
    code: '', title: '', units: 2, semester: 'first', level: '100', isElective: false,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.code.trim() || !form.title.trim()) return;
    setSaving(true);
    await onAdd(form);
    setSaving(false);
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ background: 'var(--bg-surface)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 520, padding: '24px 20px 36px', boxShadow: 'var(--shadow-3)', animation: 'lc-fade-up 0.2s ease-out' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', margin: 0 }}>Add Course Manually</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <LCIcon name="x" size={20} color="var(--text-tertiary)" />
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Course Code *</label>
              <input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                placeholder="CSC401" className="lc-input" style={{ fontSize: 13 }} />
            </div>
            <div>
              <label style={labelStyle}>Units</label>
              <input type="number" min={1} max={6} value={form.units}
                onChange={e => setForm(p => ({ ...p, units: parseInt(e.target.value) }))}
                className="lc-input" style={{ fontSize: 13 }} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Course Title *</label>
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="e.g. Operating Systems" className="lc-input" style={{ fontSize: 13 }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Level</label>
              <select value={form.level} onChange={e => setForm(p => ({ ...p, level: e.target.value }))}
                className="lc-input" style={{ fontSize: 13 }}>
                {LEVELS.map(l => <option key={l} value={l}>{l} Level</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Semester</label>
              <select value={form.semester} onChange={e => setForm(p => ({ ...p, semester: e.target.value }))}
                className="lc-input" style={{ fontSize: 13 }}>
                {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}>
            <input type="checkbox" checked={form.isElective}
              onChange={e => setForm(p => ({ ...p, isElective: e.target.checked }))} />
            Mark as elective / optional
          </label>
          <button onClick={handleSave} disabled={!form.code.trim() || !form.title.trim() || saving}
            className="lc-btn lc-btn--primary"
            style={{ width: '100%', justifyContent: 'center', opacity: form.code && form.title && !saving ? 1 : 0.5 }}>
            {saving ? 'Adding...' : 'Add Course'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Single course row ──────────────────────────────────────
const CourseRow = ({ course, index, onUpdate, onDelete, isMobile }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState({ ...course });

  const save = async () => { await onUpdate(index, draft); setEditing(false); };

  if (editing) return (
    <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: 14, border: '1.5px solid var(--brand)', marginBottom: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <div>
          <label style={labelStyle}>Code</label>
          <input value={draft.code} onChange={e => setDraft(p => ({ ...p, code: e.target.value.toUpperCase() }))}
            className="lc-input" style={{ fontSize: 12, padding: '7px 10px' }} />
        </div>
        <div>
          <label style={labelStyle}>Units</label>
          <input type="number" min={1} max={6} value={draft.units}
            onChange={e => setDraft(p => ({ ...p, units: parseInt(e.target.value) }))}
            className="lc-input" style={{ fontSize: 12, padding: '7px 10px' }} />
        </div>
        <div style={{ gridColumn: 'span 2' }}>
          <label style={labelStyle}>Title</label>
          <input value={draft.title} onChange={e => setDraft(p => ({ ...p, title: e.target.value }))}
            className="lc-input" style={{ fontSize: 12, padding: '7px 10px' }} />
        </div>
        <div>
          <label style={labelStyle}>Semester</label>
          <select value={draft.semester} onChange={e => setDraft(p => ({ ...p, semester: e.target.value }))}
            className="lc-input" style={{ fontSize: 12, padding: '7px 10px' }}>
            {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Level</label>
          <select value={draft.level} onChange={e => setDraft(p => ({ ...p, level: e.target.value }))}
            className="lc-input" style={{ fontSize: 12, padding: '7px 10px' }}>
            {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={save} className="lc-btn lc-btn--primary lc-btn--sm">Save</button>
        <button onClick={() => { setDraft({ ...course }); setEditing(false); }} className="lc-btn lc-btn--outline lc-btn--sm">Cancel</button>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: isMobile ? '9px 10px' : '11px 14px', background: 'var(--bg-surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)', marginBottom: 6 }}>
      <div style={{ flexShrink: 0, width: isMobile ? 58 : 72 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: isMobile ? 11 : 12, color: 'var(--brand)' }}>{course.code}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: isMobile ? 'nowrap' : 'normal' }}>
          {course.title}
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <span className="lc-pill lc-pill--ghost" style={{ fontSize: 9 }}>{course.units}u</span>
          <span className="lc-pill lc-pill--ghost" style={{ fontSize: 9 }}>{course.semester}</span>
          <span className="lc-pill lc-pill--academic" style={{ fontSize: 9 }}>{course.level}L</span>
          {course.isElective && <span className="lc-pill lc-pill--reward" style={{ fontSize: 9 }}>Elective</span>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        <button onClick={() => setEditing(true)} className="lc-btn lc-btn--icon lc-btn--outline" style={{ width: 30, height: 30 }}>
          <LCIcon name="edit" size={13} color="var(--text-secondary)" />
        </button>
        <button onClick={() => onDelete(index)} style={{ width: 30, height: 30, background: 'var(--error-light)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <LCIcon name="trash" size={13} color="var(--error)" />
        </button>
      </div>
    </div>
  );
};

// ── Main page ──────────────────────────────────────────────
const HandbookPage = () => {
  const fileRef    = useRef(null);
  const isMobile   = useIsMobile();
  const navigate   = useNavigate();
  const { user, updateUser } = useAuthStore();
  const isMandatory = !user?.hasHandbook; // true = first-time setup

  const [handbook, setHandbook]     = useState(null);
  const [loading, setLoading]       = useState(true);
  const [uploading, setUploading]   = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [progress, setProgress]     = useState(0);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');
  const [session, setSession]       = useState('');
  const [showAdd, setShowAdd]       = useState(false);
  const [filter, setFilter]         = useState('all');

  useEffect(() => {
    getHandbook()
      .then(r => { setHandbook(r.data.data.handbook); setSession(r.data.data.handbook?.academicSession || ''); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleFile = async (e) => {
    const file = e?.target?.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') { setError('Only PDF files are accepted.'); return; }
    setUploading(true); setError(''); setSuccess(''); setProgress(10);

    const tick = setInterval(() => setProgress(p => Math.min(p + 7, 88)), 600);
    const fd   = new FormData();
    fd.append('handbook', file);

    try {
      const res = await uploadHandbook(fd);
      clearInterval(tick); setProgress(100);
      setHandbook(res.data.data.handbook);
      setSession(res.data.data.handbook?.academicSession || '');
      setSuccess(res.data.message);
    } catch (err) {
      clearInterval(tick);
      setError(err.response?.data?.message || 'Upload failed.');
    }
    setUploading(false); setProgress(0);
    if (e?.target) e.target.value = '';
  };

  const handleUpdate = async (i, data) => {
    try { const r = await updateCourse(i, data); setHandbook(r.data.data.handbook); } catch (_) {}
  };

  const handleDelete = async (i) => {
    try { const r = await deleteCourse(i); setHandbook(r.data.data.handbook); } catch (_) {}
  };

  const handleAdd = async (data) => {
    try {
      const r = await addCourseAPI(data);
      setHandbook(r.data.data.handbook);
      setSuccess('Course added successfully.');
    } catch (err) { setError(err.response?.data?.message || 'Failed to add course.'); }
  };

  const handleConfirm = async () => {
    setConfirming(true); setError('');
    try {
      const r = await confirmCourses(handbook.courses, session);
      setHandbook(r.data.data.handbook);
      setSuccess('Courses confirmed — daily quiz is now active.');
      // Update local auth store so ProtectedRoute knows handbook is done
      updateUser({ hasHandbook: true });
      // Auto-navigate to feed after a brief success moment
      setTimeout(() => navigate('/'), 1500);
    } catch (err) { setError(err.response?.data?.message || 'Failed to confirm.'); }
    setConfirming(false);
  };

  const levelCounts = LEVELS.reduce((a, l) => { a[l] = (handbook?.courses||[]).filter(c => c.level === l).length; return a; }, {});
  const filtered    = (handbook?.courses||[]).filter(c => filter === 'all' || c.level === filter);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
      <div className="lc-animate-spin" style={{ width: 28, height: 28, border: '2.5px solid var(--border)', borderTopColor: 'var(--brand)', borderRadius: '50%' }} />
    </div>
  );

  return (
    <div style={{ fontFamily: 'var(--font-body)', paddingBottom: isMobile ? 100 : 40 }}>
      {showAdd && <AddCourseModal onAdd={handleAdd} onClose={() => setShowAdd(false)} />}

      {/* Mandatory onboarding banner */}
      {isMandatory && (
        <div style={{ background: 'linear-gradient(135deg, #0F6E56, #2563EB)', borderRadius: 'var(--radius-lg)', padding: '16px 18px', marginBottom: 20, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ fontSize: 24, flexShrink: 0 }}>📚</div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'white', marginBottom: 4 }}>
              One last step before you join LASUConnect
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>
              Upload your course handbook PDF. We'll extract your courses automatically and unlock the full app for you.
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: isMobile ? 20 : 24, color: 'var(--text-primary)', margin: '0 0 4px' }}>
          Course Handbook
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: 0 }}>
          Upload your handbook PDF — courses are extracted automatically.
        </p>
      </div>

      {/* Drop zone */}
      <div
        onClick={() => !uploading && fileRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); handleFile({ target: { files: [e.dataTransfer.files[0]] } }); }}
        style={{
          border: `2px dashed ${uploading ? 'var(--brand)' : 'var(--border-sec)'}`,
          borderRadius: 'var(--radius-lg)', padding: isMobile ? '20px 14px' : '30px 20px',
          textAlign: 'center', cursor: uploading ? 'wait' : 'pointer', marginBottom: 12,
          background: uploading ? 'var(--brand-muted)' : 'var(--bg-surface)',
          transition: 'all 0.2s ease-out',
        }}
      >
        <input ref={fileRef} type="file" accept=".pdf" onChange={handleFile} style={{ display: 'none' }} />
        <LCIcon name="upload" size={isMobile ? 22 : 28} color={uploading ? 'var(--brand)' : 'var(--text-tertiary)'}
          style={{ margin: '0 auto 8px' }} />
        {uploading ? (
          <>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--brand)', marginBottom: 10 }}>Analysing handbook...</div>
            <div className="lc-progress" style={{ maxWidth: 260, margin: '0 auto' }}>
              <div className="lc-progress-fill" style={{ width: `${progress}%`, transition: 'width 0.5s ease-out' }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 6 }}>This may take 20–30 seconds</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: isMobile ? 13 : 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>
              {handbook ? 'Replace handbook PDF' : 'Drop your handbook PDF here'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
              {handbook ? handbook.handbookName : 'Or click to browse — PDF only, max 20MB'}
            </div>
          </>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <div className="lc-error-banner" style={{ marginBottom: 10 }}>
          <LCIcon name="x" size={14} color="var(--error)" /> {error}
        </div>
      )}
      {success && (
        <div style={{ background: 'var(--success-light)', border: '0.5px solid var(--success)', borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: 13, color: 'var(--success)', marginBottom: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
          <LCIcon name="check-circle" size={15} color="var(--success)" /> {success}
        </div>
      )}

      {/* Confirmed badge */}
      {handbook?.isConfirmed && (
        <div style={{ background: 'var(--brand-light)', borderRadius: 'var(--radius-md)', padding: '11px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <LCIcon name="check-circle" size={17} color="var(--brand)" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand)' }}>Handbook confirmed</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {handbook.courses.length} courses · {handbook.academicSession || 'No session set'} · Quiz active
            </div>
          </div>
          <button onClick={() => setHandbook(p => ({ ...p, isConfirmed: false }))}
            className="lc-btn lc-btn--ghost lc-btn--sm">Edit</button>
        </div>
      )}

      {/* Course list card */}
      {handbook?.courses?.length > 0 && (
        <div className="lc-card" style={{ padding: isMobile ? '12px' : '18px 20px' }}>
          {/* Header row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, gap: 8, flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: isMobile ? 14 : 15, color: 'var(--text-primary)', margin: '0 0 2px' }}>
                Extracted Courses
              </h2>
              <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: 0 }}>
                {handbook.courses.length} found · edit anything incorrect
              </p>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <input value={session} onChange={e => setSession(e.target.value)}
                placeholder="2024/2025" className="lc-input"
                style={{ fontSize: 11, padding: '5px 10px', width: 110 }} />
              <button onClick={() => setShowAdd(true)} className="lc-btn lc-btn--ghost lc-btn--sm">
                <LCIcon name="plus" size={13} color="var(--brand)" /> Add
              </button>
            </div>
          </div>

          {/* Level filter */}
          <div style={{ display: 'flex', gap: 5, marginBottom: 12, flexWrap: 'wrap' }}>
            {[['all', `All (${handbook.courses.length})`], ...LEVELS.filter(l => levelCounts[l] > 0).map(l => [l, `${l}L (${levelCounts[l]})`])].map(([val, label]) => (
              <button key={val} onClick={() => setFilter(val)}
                style={{ padding: '4px 10px', borderRadius: 'var(--radius-full)', border: '0.5px solid var(--border)', background: filter === val ? 'var(--brand)' : 'var(--bg-elevated)', color: filter === val ? 'white' : 'var(--text-secondary)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                {label}
              </button>
            ))}
          </div>

          {/* Rows */}
          <div>
            {filtered.map((course, i) => {
              const actualIdx = handbook.courses.findIndex(c => c.code === course.code && c.semester === course.semester);
              return (
                <CourseRow key={`${course.code}-${course.semester}-${i}`}
                  course={course} index={actualIdx}
                  onUpdate={handleUpdate} onDelete={handleDelete} isMobile={isMobile} />
              );
            })}
          </div>

          {/* Confirm */}
          {!handbook.isConfirmed && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '0.5px solid var(--border)' }}>
              <button onClick={handleConfirm} disabled={confirming}
                className="lc-btn lc-btn--primary"
                style={{ width: '100%', justifyContent: 'center', opacity: confirming ? 0.7 : 1 }}>
                <LCIcon name="check" size={15} color="var(--text-inverse)" />
                {confirming ? 'Confirming...' : `Confirm ${handbook.courses.length} Courses & Activate Quiz`}
              </button>
              <p style={{ fontSize: 11, color: 'var(--text-tertiary)', textAlign: 'center', marginTop: 6, lineHeight: 1.5 }}>
                Once confirmed, your daily quiz is generated from these courses every day.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!handbook && !uploading && (
        <div style={{ textAlign: 'center', padding: isMobile ? '32px 16px' : '48px 20px' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--brand-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <LCIcon name="file-text" size={28} color="var(--brand)" />
          </div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, color: 'var(--text-primary)', marginBottom: 8 }}>
            No handbook uploaded yet
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)', lineHeight: 1.6, maxWidth: 300, margin: '0 auto 18px' }}>
            Upload your department handbook and we'll extract your full course list automatically.
          </p>
          <button onClick={() => fileRef.current?.click()} className="lc-btn lc-btn--primary">
            <LCIcon name="upload" size={15} color="var(--text-inverse)" /> Upload PDF
          </button>
        </div>
      )}

      {/* 0 extracted but handbook exists */}
      {handbook && handbook.courses.length === 0 && !uploading && (
        <div style={{ textAlign: 'center', padding: '20px 16px' }}>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 12 }}>
            No courses could be extracted automatically.
          </p>
          <button onClick={() => setShowAdd(true)} className="lc-btn lc-btn--primary">
            <LCIcon name="plus" size={15} color="var(--text-inverse)" /> Add Course Manually
          </button>
        </div>
      )}
    </div>
  );
};

export default HandbookPage;
