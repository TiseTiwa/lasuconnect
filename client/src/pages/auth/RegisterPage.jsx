import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import useIsMobile from '../../hooks/useIsMobile';

const FACULTIES = [
  'Faculty of Science', 'Faculty of Engineering', 'Faculty of Law',
  'Faculty of Management Sciences', 'Faculty of Social Sciences',
  'Faculty of Arts', 'Faculty of Education', 'Faculty of Environmental Sciences',
  'Faculty of Medicine', 'College of Agriculture',
];

const DEPARTMENTS_BY_FACULTY = {
  'Faculty of Science':                ['Computer Science', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Microbiology', 'Biochemistry'],
  'Faculty of Engineering':            ['Civil Engineering', 'Electrical Engineering', 'Mechanical Engineering', 'Chemical Engineering', 'Computer Engineering'],
  'Faculty of Law':                    ['Law'],
  'Faculty of Management Sciences':    ['Accounting', 'Business Administration', 'Finance', 'Marketing', 'Economics'],
  'Faculty of Social Sciences':        ['Sociology', 'Political Science', 'Mass Communication', 'Psychology', 'Geography'],
  'Faculty of Arts':                   ['English', 'History', 'Philosophy', 'Theatre Arts', 'Linguistics', 'Religious Studies'],
  'Faculty of Education':              ['Education', 'Educational Management', 'Curriculum Studies'],
  'Faculty of Environmental Sciences': ['Architecture', 'Estate Management', 'Urban & Regional Planning', 'Quantity Surveying'],
  'Faculty of Medicine':               ['Medicine & Surgery', 'Nursing', 'Medical Laboratory Science', 'Pharmacy'],
  'College of Agriculture':            ['Agriculture', 'Animal Science', 'Fisheries', 'Food Science'],
};

const LEVELS = ['100', '200', '300', '400', '500'];

const ROLES = [
  { id: 'student',    title: 'Student',              desc: 'Undergraduate or postgraduate student', email: '@student.lasu.edu.ng', color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
  { id: 'lecturer',   title: 'Lecturer / Staff',      desc: 'Academic or administrative staff',      email: '@lasu.edu.ng',         color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE', autoVerified: true },
  { id: 'course_rep', title: 'Course Representative', desc: 'Elected student class representative',  email: '@student.lasu.edu.ng', color: '#059669', bg: '#F0FDF4', border: '#BBF7D0' },
];

const pwStrength = (pw) => {
  if (!pw) return { score: 0, label: '', color: '#E2E8F0' };
  let s = 0;
  if (pw.length >= 8)           s++;
  if (/[A-Z]/.test(pw))        s++;
  if (/[0-9]/.test(pw))        s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return [
    { label: '',       color: '#E2E8F0' },
    { label: 'Weak',   color: '#EF4444' },
    { label: 'Fair',   color: '#F97316' },
    { label: 'Good',   color: '#EAB308' },
    { label: 'Strong', color: '#22C55E' },
  ][s];
};

const StepBar = ({ step, total, color }) => (
  <div style={{ display: 'flex', gap: 5, marginBottom: 22 }}>
    {Array.from({ length: total }).map((_, i) => (
      <div key={i} style={{ flex: 1, height: 3, borderRadius: 3, background: i < step ? color : '#E2E8F0', transition: 'background 0.25s' }} />
    ))}
  </div>
);

const Eye = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);
const EyeOff = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

const RegisterPage = () => {
  const navigate  = useNavigate();
  const isMobile  = useIsMobile();

  const [step, setStep]             = useState(1);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState(false);
  const [showPass, setShowPass]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [form, setForm] = useState({
    requestedRole: '', fullName: '', email: '', username: '',
    password: '', confirmPass: '', matricNumber: '', staffId: '',
    faculty: '', department: '', level: '', semester: 'first',
  });

  const set = (k, v) => { setError(''); setForm(p => ({ ...p, [k]: v })); };
  const role = ROLES.find(r => r.id === form.requestedRole);
  const strength = pwStrength(form.password);
  const departments = DEPARTMENTS_BY_FACULTY[form.faculty] || [];

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
      if (form.requestedRole !== 'lecturer' && (!form.level || !form.matricNumber.trim())) return false;
      if (form.requestedRole === 'lecturer' && !form.staffId.trim()) return false;
      return true;
    }
    return true;
  };

  const handleSubmit = async () => {
    setLoading(true); setError('');
    try {
      await api.post('/auth/register', {
        fullName: form.fullName.trim(), email: form.email.trim(),
        username: form.username.trim(), password: form.password,
        requestedRole: form.requestedRole,
        matricNumber: form.matricNumber.trim() || undefined,
        staffId: form.staffId.trim() || undefined,
        faculty: form.faculty, department: form.department,
        level: form.level || undefined, semester: form.semester,
      });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    }
    setLoading(false);
  };

  const inputSt = { width: '100%', padding: '10px 13px', border: '1.5px solid #E2E8F0', borderRadius: 10, fontSize: 14, color: '#0F172A', background: '#F8FAFC', fontFamily: 'var(--font-body, DM Sans, sans-serif)' };
  const labelSt = { fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 };

  if (success) return (
    <div style={pg}>
      <style>{globalCss}</style>
      <div style={{ ...card, maxWidth: isMobile ? '100%' : 480, padding: isMobile ? '24px 20px' : '36px 32px', textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: role?.bg || '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: `2px solid ${role?.border || '#BFDBFE'}` }}>
          <div style={{ width: 20, height: 20, borderRadius: '50%', background: role?.color || '#2563EB' }} />
        </div>
        <h2 style={{ fontFamily: 'Geist, sans-serif', fontWeight: 800, fontSize: 22, color: '#0F172A', marginBottom: 10 }}>Account created</h2>
        <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.7, maxWidth: 320, margin: '0 auto 20px' }}>
          {form.requestedRole === 'lecturer'
            ? `Welcome, ${form.fullName.split(' ')[0]}. Your lecturer status is auto-verified. Check your email to activate your account.`
            : form.requestedRole === 'course_rep'
            ? `Welcome, ${form.fullName.split(' ')[0]}. Your course rep request is pending admin approval. Check your email to activate.`
            : `Welcome to LASUConnect, ${form.fullName.split(' ')[0]}. Check your email to verify your account.`
          }
        </p>
        <div style={{ fontSize: 12, color: role?.color || '#2563EB', background: role?.bg || '#EFF6FF', borderRadius: 20, padding: '4px 14px', display: 'inline-block', marginBottom: 20, border: `1px solid ${role?.border || '#BFDBFE'}` }}>
          {role?.title}{form.requestedRole === 'lecturer' && ' · Verified'}
        </div>
        <button onClick={() => navigate('/login')}
          style={{ display: 'block', width: '100%', padding: 12, background: `linear-gradient(135deg, ${role?.color || '#2563EB'}, ${role?.color || '#2563EB'}cc)`, color: 'white', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'Geist, sans-serif' }}>
          Go to Login
        </button>
      </div>
    </div>
  );

  return (
    <div style={pg}>
      <style>{globalCss}</style>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <img src="/lasuconnect-logo.png" alt="LASU Logo" style={{ width: 34, height: 34, objectFit: 'contain' }} />
        <span style={{ fontFamily: 'Geist, sans-serif', fontWeight: 800, fontSize: 17, color: '#0F172A' }}>LASUConnect</span>
      </div>

      <div style={{ ...card, maxWidth: isMobile ? '100%' : 480, padding: isMobile ? '20px 16px' : '30px 28px' }}>
        <StepBar step={step} total={4} color={role?.color || '#2563EB'} />

        {/* Step 1 — Role */}
        {step === 1 && (
          <div>
            <h2 style={{ fontFamily: 'Geist, sans-serif', fontWeight: 800, fontSize: isMobile ? 18 : 21, color: '#0F172A', marginBottom: 4 }}>Who are you?</h2>
            <p style={{ fontSize: 13, color: '#64748B', marginBottom: 18, lineHeight: 1.5 }}>Select your role at Lagos State University</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
              {ROLES.map(r => (
                <div key={r.id} onClick={() => set('requestedRole', r.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', borderRadius: 12, border: `2px solid ${form.requestedRole === r.id ? r.color : '#E2E8F0'}`, background: form.requestedRole === r.id ? r.bg : 'white', cursor: 'pointer', transition: 'all 0.15s', boxShadow: form.requestedRole === r.id ? `0 0 0 3px ${r.color}18` : 'none' }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${form.requestedRole === r.id ? r.color : '#E2E8F0'}`, background: form.requestedRole === r.id ? r.color : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {form.requestedRole === r.id && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'white' }} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
                      <span style={{ fontFamily: 'Geist, sans-serif', fontWeight: 700, fontSize: 14, color: '#0F172A' }}>{r.title}</span>
                      {r.autoVerified && <span style={{ fontSize: 9, background: '#DCFCE7', color: '#16A34A', borderRadius: 20, padding: '1px 7px', fontWeight: 700 }}>Auto-verified</span>}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748B' }}>{r.desc}</div>
                    <div style={{ fontSize: 11, color: r.color, fontWeight: 600, marginTop: 3 }}>{r.email}</div>
                  </div>
                </div>
              ))}
            </div>
            {form.requestedRole === 'course_rep' && (
              <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '10px 13px', display: 'flex', gap: 8, fontSize: 12, color: '#374151', lineHeight: 1.5 }}>
                <span style={{ flexShrink: 0, fontWeight: 700 }}>i</span>
                Course rep accounts require admin approval. You can use the app as a student while your rep status is reviewed.
              </div>
            )}
            {form.requestedRole === 'lecturer' && (
              <div style={{ background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 10, padding: '10px 13px', display: 'flex', gap: 8, fontSize: 12, color: '#374151', lineHeight: 1.5 }}>
                <span style={{ flexShrink: 0, fontWeight: 700 }}>i</span>
                Lecturer status is <strong>auto-verified</strong> via your @lasu.edu.ng staff email.
              </div>
            )}
          </div>
        )}

        {/* Step 2 — Account */}
        {step === 2 && (
          <div>
            <h2 style={{ fontFamily: 'Geist, sans-serif', fontWeight: 800, fontSize: isMobile ? 18 : 21, color: '#0F172A', marginBottom: 4 }}>Create account</h2>
            <div style={{ fontSize: 12, color: role?.color || '#2563EB', background: role?.bg || '#EFF6FF', borderRadius: 20, padding: '2px 10px', display: 'inline-block', marginBottom: 18, fontWeight: 600 }}>
              {role?.title}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              <div>
                <label style={labelSt}>Full Name</label>
                <input value={form.fullName} onChange={e => set('fullName', e.target.value)} placeholder="e.g. Ismail Idris" style={inputSt} />
              </div>
              <div>
                <label style={labelSt}>{form.requestedRole === 'lecturer' ? 'Staff Email' : 'LASU Email'}</label>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                  placeholder={form.requestedRole === 'lecturer' ? 'you@lasu.edu.ng' : 'you@student.lasu.edu.ng'} style={inputSt} />
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
                  {form.requestedRole === 'lecturer' ? 'Must be @lasu.edu.ng staff email' : 'Must be your official LASU student email'}
                </div>
              </div>
              <div>
                <label style={labelSt}>Username</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', fontSize: 14 }}>@</span>
                  <input value={form.username} onChange={e => set('username', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="yourhandle" style={{ ...inputSt, paddingLeft: 28 }} />
                </div>
              </div>
              <div>
                <label style={labelSt}>
                  Password
                  {form.password && <span style={{ color: strength.color, fontWeight: 700, marginLeft: 8, fontSize: 11 }}>{strength.label}</span>}
                </label>
                <div style={{ position: 'relative' }}>
                  <input type={showPass ? 'text' : 'password'} value={form.password} onChange={e => set('password', e.target.value)} placeholder="Min. 6 characters" style={{ ...inputSt, paddingRight: 40 }} />
                  <button type="button" onClick={() => setShowPass(p => !p)} style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#94A3B8', display: 'flex', alignItems: 'center' }}>
                    {showPass ? <EyeOff /> : <Eye />}
                  </button>
                </div>
                {form.password && (
                  <div style={{ display: 'flex', gap: 3, marginTop: 5 }}>
                    {[1,2,3,4].map(i => <div key={i} style={{ flex: 1, height: 3, borderRadius: 3, background: i <= pwStrength(form.password).score ? pwStrength(form.password).color : '#E2E8F0' }} />)}
                  </div>
                )}
              </div>
              <div>
                <label style={labelSt}>Confirm Password</label>
                <div style={{ position: 'relative' }}>
                  <input type={showConfirm ? 'text' : 'password'} value={form.confirmPass} onChange={e => set('confirmPass', e.target.value)}
                    placeholder="Repeat password" style={{ ...inputSt, paddingRight: 40, borderColor: form.confirmPass && form.password !== form.confirmPass ? '#EF4444' : '#E2E8F0' }} />
                  <button type="button" onClick={() => setShowConfirm(p => !p)} style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#94A3B8', display: 'flex', alignItems: 'center' }}>
                    {showConfirm ? <EyeOff /> : <Eye />}
                  </button>
                </div>
                {form.confirmPass && form.password !== form.confirmPass && (
                  <div style={{ fontSize: 12, color: '#EF4444', marginTop: 4 }}>Passwords do not match</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 3 — Academic */}
        {step === 3 && (
          <div>
            <h2 style={{ fontFamily: 'Geist, sans-serif', fontWeight: 800, fontSize: isMobile ? 18 : 21, color: '#0F172A', marginBottom: 4 }}>Academic details</h2>
            <p style={{ fontSize: 13, color: '#64748B', marginBottom: 18 }}>Help your coursemates and lecturers find you</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              {form.requestedRole === 'lecturer' ? (
                <div>
                  <label style={labelSt}>Staff ID</label>
                  <input value={form.staffId} onChange={e => set('staffId', e.target.value)} placeholder="e.g. LASU/STF/2021/001" style={inputSt} />
                </div>
              ) : (
                <div>
                  <label style={labelSt}>Matric Number</label>
                  <input value={form.matricNumber} onChange={e => set('matricNumber', e.target.value.toUpperCase())} placeholder="e.g. 220591160" style={inputSt} />
                </div>
              )}
              <div>
                <label style={labelSt}>Faculty</label>
                <select value={form.faculty} onChange={e => { set('faculty', e.target.value); set('department', ''); }} style={{ ...inputSt, appearance: 'auto' }}>
                  <option value="">Select faculty</option>
                  {FACULTIES.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label style={labelSt}>Department</label>
                <select value={form.department} onChange={e => set('department', e.target.value)} disabled={!form.faculty} style={{ ...inputSt, appearance: 'auto', opacity: !form.faculty ? 0.6 : 1 }}>
                  <option value="">Select department</option>
                  {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              {form.requestedRole !== 'lecturer' && (
                <div>
                  <label style={labelSt}>Level</label>
                  <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                    {LEVELS.map(l => (
                      <button key={l} type="button" onClick={() => set('level', l)}
                        style={{ flex: '1 1 calc(20% - 6px)', minWidth: 48, padding: '9px 4px', borderRadius: 9, border: `2px solid ${form.level === l ? (role?.color || '#2563EB') : '#E2E8F0'}`, background: form.level === l ? (role?.bg || '#EFF6FF') : 'white', color: form.level === l ? (role?.color || '#2563EB') : '#64748B', fontFamily: 'Geist, sans-serif', fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s' }}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label style={labelSt}>Semester</label>
                <div style={{ display: 'flex', gap: 7 }}>
                  {[['first','Harmattan'],['second','Rain']].map(([v, l]) => (
                    <button key={v} type="button" onClick={() => set('semester', v)}
                      style={{ flex: 1, padding: '9px', borderRadius: 9, border: `2px solid ${form.semester === v ? (role?.color || '#2563EB') : '#E2E8F0'}`, background: form.semester === v ? (role?.bg || '#EFF6FF') : 'white', color: form.semester === v ? (role?.color || '#2563EB') : '#64748B', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4 — Confirm */}
        {step === 4 && (
          <div>
            <h2 style={{ fontFamily: 'Geist, sans-serif', fontWeight: 800, fontSize: isMobile ? 18 : 21, color: '#0F172A', marginBottom: 4 }}>Review & confirm</h2>
            <p style={{ fontSize: 13, color: '#64748B', marginBottom: 18 }}>Everything look right?</p>
            <div style={{ background: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0', padding: '14px 16px', marginBottom: 4 }}>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: role?.color, background: role?.bg, borderRadius: 20, padding: '4px 14px', display: 'inline-block', fontWeight: 700, border: `1px solid ${role?.border}` }}>
                  {role?.title}{form.requestedRole === 'lecturer' && ' · Auto-verified'}
                </div>
              </div>
              {[
                ['Name', form.fullName],
                ['Email', form.email],
                ['Username', `@${form.username}`],
                [form.requestedRole === 'lecturer' ? 'Staff ID' : 'Matric No.', form.staffId || form.matricNumber],
                ['Faculty', form.faculty],
                ['Department', form.department],
                form.requestedRole !== 'lecturer' && ['Level', `${form.level} Level`],
              ].filter(Boolean).map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '7px 0', borderBottom: '1px solid #F1F5F9' }}>
                  <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500 }}>{label}</span>
                  <span style={{ fontSize: 13, color: '#0F172A', fontWeight: 600, maxWidth: '60%', textAlign: 'right', wordBreak: 'break-word', fontFamily: 'Geist, sans-serif' }}>{value}</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 11.5, color: '#94A3B8', textAlign: 'center', lineHeight: 1.6, marginTop: 10 }}>
              By creating an account you confirm this is a genuine LASU identity.
            </p>
          </div>
        )}

        {/* Error */}
        {error && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 9, padding: '9px 13px', fontSize: 13, color: '#DC2626', marginTop: 12 }}>{error}</div>}

        {/* Navigation */}
        <div style={{ display: 'flex', gap: 9, marginTop: 20 }}>
          {step > 1 && (
            <button onClick={() => setStep(p => p - 1)} style={{ padding: '12px 16px', borderRadius: 10, border: '1.5px solid #E2E8F0', background: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#374151', fontFamily: 'DM Sans, sans-serif' }}>
              Back
            </button>
          )}
          {step < 4 ? (
            <button onClick={() => canProceed() && setStep(p => p + 1)} disabled={!canProceed()}
              style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${role?.color || '#2563EB'}, ${(role?.color || '#2563EB')}cc)`, color: 'white', fontSize: isMobile ? 14 : 15, fontWeight: 700, cursor: canProceed() ? 'pointer' : 'not-allowed', opacity: canProceed() ? 1 : 0.5, fontFamily: 'Geist, sans-serif' }}>
              Continue
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={loading}
              style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${role?.color || '#2563EB'}, ${(role?.color || '#2563EB')}cc)`, color: 'white', fontSize: isMobile ? 13 : 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: 'Geist, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {loading ? (
                <><div style={{ width: 15, height: 15, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'lc-spin 0.7s linear infinite' }} /> Creating…</>
              ) : 'Create Account'}
            </button>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: 13, color: '#64748B', marginTop: 16 }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: role?.color || '#2563EB', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
};

const pg   = { minHeight: '100vh', background: 'linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px 60px', fontFamily: 'DM Sans, sans-serif' };
const card = { width: '100%', background: 'white', borderRadius: 20, boxShadow: '0 6px 36px rgba(0,0,0,0.09)', border: '1px solid #E2E8F0' };

const globalCss = `
  @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
  * { box-sizing: border-box; }
  input:focus, select:focus { outline: 2px solid #2563EB; outline-offset: 0; border-radius: 10px; }
  @keyframes lc-spin { to { transform: rotate(360deg); } }
`;

export default RegisterPage;
