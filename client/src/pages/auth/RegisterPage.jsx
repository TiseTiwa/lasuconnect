import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import useIsMobile from '../../hooks/useIsMobile';

// ── Constants ──────────────────────────────────────────────
const FACULTIES = [
  'Faculty of Science', 'Faculty of Engineering', 'Faculty of Law',
  'Faculty of Management Sciences', 'Faculty of Social Sciences',
  'Faculty of Arts', 'Faculty of Education', 'Faculty of Environmental Sciences',
  'Faculty of Medicine', 'College of Agriculture',
];

const DEPARTMENTS_BY_FACULTY = {
  'Faculty of Science':               ['Computer Science', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Microbiology', 'Biochemistry'],
  'Faculty of Engineering':           ['Civil Engineering', 'Electrical Engineering', 'Mechanical Engineering', 'Chemical Engineering', 'Computer Engineering'],
  'Faculty of Law':                   ['Law'],
  'Faculty of Management Sciences':   ['Accounting', 'Business Administration', 'Finance', 'Marketing', 'Economics'],
  'Faculty of Social Sciences':       ['Sociology', 'Political Science', 'Mass Communication', 'Psychology', 'Geography'],
  'Faculty of Arts':                  ['English', 'History', 'Philosophy', 'Theatre Arts', 'Linguistics', 'Religious Studies'],
  'Faculty of Education':             ['Education', 'Educational Management', 'Curriculum Studies'],
  'Faculty of Environmental Sciences':['Architecture', 'Estate Management', 'Urban & Regional Planning', 'Quantity Surveying'],
  'Faculty of Medicine':              ['Medicine & Surgery', 'Nursing', 'Medical Laboratory Science', 'Pharmacy'],
  'College of Agriculture':           ['Agriculture', 'Animal Science', 'Fisheries', 'Food Science'],
};

const LEVELS = ['100', '200', '300', '400', '500'];

const ROLES = [
  {
    id: 'student', icon: '🎓', title: 'Student',
    desc: 'Undergraduate or postgraduate student at LASU',
    email: '@student.lasu.edu.ng or @st.lasu.edu.ng',
    color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE',
  },
  {
    id: 'lecturer', icon: '👨‍🏫', title: 'Lecturer / Staff',
    desc: 'Academic or administrative staff at LASU',
    email: 'Official staff email @lasu.edu.ng',
    color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE',
    autoVerified: true,
  },
  {
    id: 'course_rep', icon: '📋', title: 'Course Representative',
    desc: 'Elected student representative for your class',
    email: '@student.lasu.edu.ng or @st.lasu.edu.ng',
    color: '#059669', bg: '#F0FDF4', border: '#BBF7D0',
  },
];

const getPasswordStrength = (pw) => {
  if (!pw) return { score: 0, label: '', color: '#E2E8F0' };
  let score = 0;
  if (pw.length >= 8)             score++;
  if (/[A-Z]/.test(pw))           score++;
  if (/[0-9]/.test(pw))           score++;
  if (/[^A-Za-z0-9]/.test(pw))   score++;
  const map = [
    { label: '',       color: '#E2E8F0' },
    { label: 'Weak',   color: '#EF4444' },
    { label: 'Fair',   color: '#F97316' },
    { label: 'Good',   color: '#EAB308' },
    { label: 'Strong', color: '#22C55E' },
  ];
  return { score, ...map[score] };
};

const StepIndicator = ({ current, total, role }) => {
  const cfg = ROLES.find(r => r.id === role) || ROLES[0];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{ height: 4, flex: 1, borderRadius: 4, background: i < current ? cfg.color : '#E2E8F0', transition: 'background 0.3s' }} />
      ))}
    </div>
  );
};

// ── Main Register Page ─────────────────────────────────────
const RegisterPage = () => {
  const navigate  = useNavigate();
  const isMobile  = useIsMobile();

  const [step, setStep]       = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    requestedRole: '', fullName: '', email: '', username: '',
    password: '', confirmPass: '', matricNumber: '', staffId: '',
    faculty: '', department: '', level: '', semester: 'first',
  });

  const set = (key, val) => { setError(''); setForm(p => ({ ...p, [key]: val })); };

  const selectedRole  = ROLES.find(r => r.id === form.requestedRole);
  const strength      = getPasswordStrength(form.password);
  const departments   = DEPARTMENTS_BY_FACULTY[form.faculty] || [];

  const canProceed = () => {
    if (step === 1) return !!form.requestedRole;
    if (step === 2) {
      if (!form.fullName.trim() || !form.email.trim() || !form.username.trim()) return false;
      if (!form.password || form.password.length < 6) return false;
      if (form.password !== form.confirmPass) return false;
      return true;
    }
    if (step === 3) {
      if (!form.faculty || !form.department) return false;
      if (form.requestedRole !== 'lecturer' && !form.level) return false;
      if (form.requestedRole === 'lecturer' && !form.staffId.trim()) return false;
      if (form.requestedRole !== 'lecturer' && !form.matricNumber.trim()) return false;
      return true;
    }
    return true;
  };

  const handleNext   = () => { if (!canProceed()) return; setStep(p => p + 1); };
  const handleBack   = () => setStep(p => p - 1);

  const handleSubmit = async () => {
    setLoading(true); setError('');
    try {
      await api.post('/auth/register', {
        fullName:      form.fullName.trim(),
        email:         form.email.trim(),
        username:      form.username.trim(),
        password:      form.password,
        requestedRole: form.requestedRole,
        matricNumber:  form.matricNumber.trim() || undefined,
        staffId:       form.staffId.trim() || undefined,
        faculty:       form.faculty,
        department:    form.department,
        level:         form.level || undefined,
        semester:      form.semester,
      });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    }
    setLoading(false);
  };

  // ── Success screen ─────────────────────────────────────
  if (success) {
    return (
      <div style={{ ...s.page, padding: isMobile ? '24px 16px 40px' : '32px 16px 60px' }}>
        <style>{globalStyles}</style>
        <div style={{ ...s.card, padding: isMobile ? '24px 20px' : '32px 28px' }}>
          <div style={{ textAlign: 'center', padding: isMobile ? '16px 0' : '32px 0' }}>
            <div style={{ fontSize: isMobile ? 48 : 64, marginBottom: 16 }}>🎉</div>
            <h2 style={{ fontFamily: 'Geist, sans-serif', fontWeight: 800, fontSize: isMobile ? 20 : 24, color: '#0F172A', marginBottom: 10 }}>
              Account Created!
            </h2>
            <p style={{ fontSize: isMobile ? 14 : 15, color: '#64748B', lineHeight: 1.7, maxWidth: 340, margin: '0 auto 8px' }}>
              {form.requestedRole === 'lecturer'
                ? `Welcome, ${form.fullName.split(' ')[0]}! Your lecturer status has been automatically verified via your staff email. Check your inbox to verify your account.`
                : form.requestedRole === 'course_rep'
                ? `Welcome, ${form.fullName.split(' ')[0]}! Your course rep request is pending admin approval. Check your inbox to verify your account.`
                : `Welcome to LASUConnect, ${form.fullName.split(' ')[0]}! Check your inbox to verify your account.`
              }
            </p>
            <div style={{ ...s.rolePillLarge, background: selectedRole?.bg, color: selectedRole?.color, border: `1.5px solid ${selectedRole?.border}`, margin: '16px auto 24px', display: 'inline-block' }}>
              {selectedRole?.icon} {selectedRole?.title}
              {form.requestedRole === 'lecturer'   && ' · ✓ Auto-verified'}
              {form.requestedRole === 'course_rep' && ' · Pending approval'}
            </div>
            <br />
            <button onClick={() => navigate('/login')}
              style={{ ...s.primaryBtn, background: `linear-gradient(135deg, ${selectedRole?.color}, ${selectedRole?.color}cc)`, width: isMobile ? '100%' : 'auto', padding: isMobile ? '13px' : '13px 32px' }}>
              Go to Login →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...s.page, padding: isMobile ? '20px 12px 40px' : '32px 16px 60px' }}>
      <style>{globalStyles}</style>

      {/* Logo */}
      <div style={s.logoRow}>
        <div style={s.logoIcon}>LC</div>
        <span style={s.logoText}>LASUConnect</span>
      </div>

      <div style={{ ...s.card, padding: isMobile ? '20px 16px' : '32px 28px', borderRadius: isMobile ? 20 : 24 }}>
        <StepIndicator current={step} total={4} role={form.requestedRole || 'student'} />

        {/* ── STEP 1: Choose Role ── */}
        {step === 1 && (
          <div className="step-enter">
            <h2 style={{ ...s.stepTitle, fontSize: isMobile ? 18 : 22 }}>Who are you?</h2>
            <p style={s.stepSubtitle}>Choose your role at Lagos State University</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {ROLES.map(role => (
                <div key={role.id} onClick={() => set('requestedRole', role.id)}
                  style={{ ...s.roleCard, borderColor: form.requestedRole === role.id ? role.color : '#E2E8F0', background: form.requestedRole === role.id ? role.bg : 'white', boxShadow: form.requestedRole === role.id ? `0 0 0 3px ${role.color}22` : 'none', padding: isMobile ? '12px' : '14px 16px', gap: isMobile ? 10 : 14 }}>
                  <div style={{ fontSize: isMobile ? 22 : 28, flexShrink: 0 }}>{role.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'Geist, sans-serif', fontWeight: 700, fontSize: isMobile ? 13 : 15, color: '#0F172A' }}>
                        {role.title}
                      </span>
                      {role.autoVerified && (
                        <span style={{ fontSize: 10, background: '#DCFCE7', color: '#16A34A', borderRadius: 20, padding: '1px 8px', fontWeight: 700 }}>
                          Auto-verified ✓
                        </span>
                      )}
                    </div>
                    {/* Hide desc on very small screens to keep cards compact */}
                    {!isMobile && <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>{role.desc}</div>}
                    <div style={{ fontSize: 11, color: role.color, fontWeight: 600, marginTop: 3 }}>✉️ {role.email}</div>
                  </div>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${form.requestedRole === role.id ? role.color : '#E2E8F0'}`, background: form.requestedRole === role.id ? role.color : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                    {form.requestedRole === role.id && <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'white' }} />}
                  </div>
                </div>
              ))}
            </div>

            {form.requestedRole === 'course_rep' && (
              <div style={s.infoBox}>
                <span style={{ fontSize: 15, flexShrink: 0 }}>ℹ️</span>
                <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>
                  Course Rep accounts require admin approval. You can use the app as a student while your rep status is reviewed.
                </div>
              </div>
            )}
            {form.requestedRole === 'lecturer' && (
              <div style={{ ...s.infoBox, background: '#F5F3FF', borderColor: '#DDD6FE' }}>
                <span style={{ fontSize: 15, flexShrink: 0 }}>✅</span>
                <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>
                  Your lecturer status will be <strong>automatically verified</strong> using your @lasu.edu.ng staff email.
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: Account Details ── */}
        {step === 2 && (
          <div className="step-enter">
            <h2 style={{ ...s.stepTitle, fontSize: isMobile ? 18 : 22 }}>Create your account</h2>
            <p style={s.stepSubtitle}>
              <span style={{ ...s.rolePill, background: selectedRole?.bg, color: selectedRole?.color }}>
                {selectedRole?.icon} {selectedRole?.title}
              </span>
            </p>

            <div style={s.form}>
              <div style={s.field}>
                <label style={s.label}>Full Name *</label>
                <input value={form.fullName} onChange={e => set('fullName', e.target.value)}
                  placeholder="e.g. Ismail Idris" style={s.input} />
              </div>

              <div style={s.field}>
                <label style={s.label}>{form.requestedRole === 'lecturer' ? 'Staff Email *' : 'LASU Email *'}</label>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                  placeholder={form.requestedRole === 'lecturer' ? 'you@lasu.edu.ng' : 'you@student.lasu.edu.ng'}
                  style={s.input} />
                <span style={s.hint}>
                  {form.requestedRole === 'lecturer' ? 'Must be your official @lasu.edu.ng staff email' : 'Must be your official LASU student email'}
                </span>
              </div>

              <div style={s.field}>
                <label style={s.label}>Username *</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', fontSize: 14 }}>@</span>
                  <input value={form.username} onChange={e => set('username', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="yourhandle" style={{ ...s.input, paddingLeft: 30 }} />
                </div>
                <span style={s.hint}>Letters, numbers, underscores only</span>
              </div>

              <div style={s.field}>
                <label style={s.label}>
                  Password * <span style={{ color: strength.color, fontWeight: 600, fontSize: 11 }}>{strength.label}</span>
                </label>
                <input type="password" value={form.password} onChange={e => set('password', e.target.value)}
                  placeholder="Min. 6 characters" style={s.input} />
                {form.password && (
                  <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                    {[1,2,3,4].map(i => (
                      <div key={i} style={{ flex: 1, height: 4, borderRadius: 4, background: i <= strength.score ? strength.color : '#E2E8F0', transition: 'background 0.3s' }} />
                    ))}
                  </div>
                )}
              </div>

              <div style={s.field}>
                <label style={s.label}>Confirm Password *</label>
                <input type="password" value={form.confirmPass} onChange={e => set('confirmPass', e.target.value)}
                  placeholder="Repeat password"
                  style={{ ...s.input, borderColor: form.confirmPass && form.password !== form.confirmPass ? '#EF4444' : '#E2E8F0' }} />
                {form.confirmPass && form.password !== form.confirmPass && (
                  <span style={{ fontSize: 12, color: '#EF4444', marginTop: 4, display: 'block' }}>Passwords do not match</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3: Academic Info ── */}
        {step === 3 && (
          <div className="step-enter">
            <h2 style={{ ...s.stepTitle, fontSize: isMobile ? 18 : 22 }}>Academic details</h2>
            <p style={s.stepSubtitle}>Help your coursemates and lecturers find you</p>

            <div style={s.form}>
              {form.requestedRole === 'lecturer' ? (
                <div style={s.field}>
                  <label style={s.label}>Staff ID *</label>
                  <input value={form.staffId} onChange={e => set('staffId', e.target.value)}
                    placeholder="e.g. LASU/STF/2021/001" style={s.input} />
                </div>
              ) : (
                <div style={s.field}>
                  <label style={s.label}>Matric Number *</label>
                  <input value={form.matricNumber} onChange={e => set('matricNumber', e.target.value.toUpperCase())}
                    placeholder="e.g. 220591160" style={s.input} />
                </div>
              )}

              <div style={s.field}>
                <label style={s.label}>Faculty *</label>
                <select value={form.faculty} onChange={e => { set('faculty', e.target.value); set('department', ''); }} style={s.select}>
                  <option value="">Select faculty</option>
                  {FACULTIES.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>

              <div style={s.field}>
                <label style={s.label}>Department *</label>
                <select value={form.department} onChange={e => set('department', e.target.value)} style={s.select} disabled={!form.faculty}>
                  <option value="">Select department</option>
                  {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              {form.requestedRole !== 'lecturer' && (
                <div style={s.field}>
                  <label style={s.label}>Level *</label>
                  {/* On mobile: wrap into 2 rows of smaller pills */}
                  <div style={{ display: 'flex', gap: isMobile ? 6 : 8, flexWrap: 'wrap' }}>
                    {LEVELS.map(l => (
                      <button key={l} type="button" onClick={() => set('level', l)}
                        style={{
                          flex: isMobile ? '1 1 calc(33% - 6px)' : 1,
                          padding: isMobile ? '9px 4px' : '10px 4px',
                          borderRadius: 10,
                          border: `2px solid ${form.level === l ? selectedRole?.color || '#2563EB' : '#E2E8F0'}`,
                          background: form.level === l ? (selectedRole?.bg || '#EFF6FF') : 'white',
                          color: form.level === l ? (selectedRole?.color || '#2563EB') : '#64748B',
                          fontFamily: 'Geist, sans-serif', fontWeight: 700,
                          fontSize: isMobile ? 12 : 13, cursor: 'pointer',
                          transition: 'all 0.15s', minWidth: 0,
                        }}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div style={s.field}>
                <label style={s.label}>Semester</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[['first', '1st Semester'], ['second', '2nd Semester']].map(([val, label]) => (
                    <button key={val} type="button" onClick={() => set('semester', val)}
                      style={{
                        flex: 1, padding: isMobile ? '9px 4px' : '10px',
                        borderRadius: 10,
                        border: `2px solid ${form.semester === val ? selectedRole?.color || '#2563EB' : '#E2E8F0'}`,
                        background: form.semester === val ? (selectedRole?.bg || '#EFF6FF') : 'white',
                        color: form.semester === val ? (selectedRole?.color || '#2563EB') : '#64748B',
                        fontFamily: "'DM Sans', sans-serif", fontWeight: 600,
                        fontSize: isMobile ? 12 : 13, cursor: 'pointer',
                      }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 4: Review & Confirm ── */}
        {step === 4 && (
          <div className="step-enter">
            <h2 style={{ ...s.stepTitle, fontSize: isMobile ? 18 : 22 }}>Review & confirm</h2>
            <p style={s.stepSubtitle}>Everything look good? Let's get you on campus.</p>

            <div style={s.reviewCard}>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: isMobile ? 36 : 44, marginBottom: 8 }}>{selectedRole?.icon}</div>
                <div style={{ ...s.rolePillLarge, background: selectedRole?.bg, color: selectedRole?.color, border: `1.5px solid ${selectedRole?.border}`, display: 'inline-block' }}>
                  {selectedRole?.title}
                  {form.requestedRole === 'lecturer' && <span style={{ marginLeft: 6, fontSize: 11, color: '#16A34A', fontWeight: 700 }}>· Auto-verified ✓</span>}
                </div>
              </div>

              {[
                { label: 'Name',       value: form.fullName },
                { label: 'Email',      value: form.email },
                { label: 'Username',   value: `@${form.username}` },
                { label: form.requestedRole === 'lecturer' ? 'Staff ID' : 'Matric No.', value: form.staffId || form.matricNumber },
                { label: 'Faculty',    value: form.faculty },
                { label: 'Department', value: form.department },
                form.requestedRole !== 'lecturer' && { label: 'Level', value: `${form.level} Level` },
              ].filter(Boolean).map(({ label, value }) => (
                <div key={label} style={s.reviewRow}>
                  <span style={s.reviewLabel}>{label}</span>
                  <span style={{ ...s.reviewValue, fontSize: isMobile ? 12 : 13 }}>{value}</span>
                </div>
              ))}
            </div>

            <p style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', lineHeight: 1.6, marginTop: 12 }}>
              By creating an account, you agree to LASUConnect's Terms of Service and confirm this is a genuine LASU identity.
            </p>
          </div>
        )}

        {error && <div style={s.errorBanner} className="shake">⚠️ {error}</div>}

        {/* Navigation buttons */}
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          {step > 1 && (
            <button onClick={handleBack} style={{ ...s.backBtn, padding: isMobile ? '11px 14px' : '13px 18px' }}>← Back</button>
          )}
          {step < 4 ? (
            <button onClick={handleNext} disabled={!canProceed()}
              style={{ ...s.primaryBtn, flex: 1, opacity: canProceed() ? 1 : 0.5, background: `linear-gradient(135deg, ${selectedRole?.color || '#2563EB'}, ${selectedRole?.color || '#3B82F6'}cc)`, fontSize: isMobile ? 14 : 15 }}>
              Continue →
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={loading}
              style={{ ...s.primaryBtn, flex: 1, opacity: loading ? 0.7 : 1, background: `linear-gradient(135deg, ${selectedRole?.color || '#2563EB'}, ${selectedRole?.color || '#3B82F6'}cc)`, fontSize: isMobile ? 13 : 15 }}>
              {loading ? 'Creating account...' : `🚀 Create ${isMobile ? '' : selectedRole?.title + ' '}Account`}
            </button>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: isMobile ? 13 : 14, color: '#64748B', marginTop: 16 }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: selectedRole?.color || '#2563EB', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
};

// ── Global styles ──────────────────────────────────────────
const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
  * { box-sizing: border-box; }
  input:focus, select:focus { outline: 2px solid #2563EB; outline-offset: 0; border-radius: 10px; }
  @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-6px)} 75%{transform:translateX(6px)} }
  .step-enter { animation: fadeUp 0.3s ease forwards; }
  .shake { animation: shake 0.35s ease; }
`;

// ─── Styles ───────────────────────────────────────────────
const s = {
  page:         { minHeight: '100vh', background: 'linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: "'DM Sans', sans-serif" },
  logoRow:      { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 },
  logoIcon:     { width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg, #1D4ED8, #3B82F6)', color: 'white', fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Geist, sans-serif' },
  logoText:     { fontFamily: 'Geist, sans-serif', fontWeight: 800, fontSize: 19, color: '#0F172A' },
  card:         { width: '100%', maxWidth: 480, background: 'white', boxShadow: '0 8px 40px rgba(0,0,0,0.1)', border: '1px solid #E2E8F0' },
  stepTitle:    { fontFamily: 'Geist, sans-serif', fontWeight: 800, color: '#0F172A', margin: '0 0 6px' },
  stepSubtitle: { fontSize: 14, color: '#64748B', margin: '0 0 18px', lineHeight: 1.5 },
  roleCard:     { display: 'flex', alignItems: 'center', borderRadius: 14, border: '2px solid #E2E8F0', cursor: 'pointer', transition: 'all 0.2s' },
  form:         { display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 4 },
  field:        { display: 'flex', flexDirection: 'column', gap: 4 },
  label:        { fontSize: 13, fontWeight: 600, color: '#374151' },
  hint:         { fontSize: 11, color: '#94A3B8' },
  input:        { padding: '11px 14px', border: '1.5px solid #E2E8F0', borderRadius: 10, fontSize: 14, color: '#0F172A', background: '#F8FAFC', fontFamily: "'DM Sans', sans-serif", width: '100%' },
  select:       { padding: '11px 14px', border: '1.5px solid #E2E8F0', borderRadius: 10, fontSize: 14, color: '#0F172A', background: '#F8FAFC', fontFamily: "'DM Sans', sans-serif", width: '100%' },
  rolePill:         { fontSize: 12, fontWeight: 700, borderRadius: 20, padding: '3px 12px', display: 'inline-block' },
  rolePillLarge:    { fontSize: 14, fontWeight: 700, borderRadius: 20, padding: '5px 16px' },
  infoBox:          { background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 12, padding: '11px 13px', display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 4 },
  reviewCard:       { background: '#F8FAFC', borderRadius: 14, border: '1px solid #E2E8F0', padding: '14px 16px', marginBottom: 4 },
  reviewRow:        { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '7px 0', borderBottom: '1px solid #F1F5F9' },
  reviewLabel:      { fontSize: 13, color: '#94A3B8', fontWeight: 500, flexShrink: 0, marginRight: 8 },
  reviewValue:      { fontWeight: 600, fontFamily: 'Geist, sans-serif', textAlign: 'right', maxWidth: '65%', wordBreak: 'break-word' },
  primaryBtn:       { padding: '13px', borderRadius: 12, border: 'none', color: 'white', fontWeight: 700, cursor: 'pointer', fontFamily: 'Geist, sans-serif', boxShadow: '0 4px 14px rgba(37,99,235,0.3)', transition: 'opacity 0.15s' },
  backBtn:          { borderRadius: 12, border: '1.5px solid #E2E8F0', background: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#374151', fontFamily: "'DM Sans', sans-serif" },
  errorBanner:      { background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#DC2626', marginTop: 10 },
};

export default RegisterPage;
