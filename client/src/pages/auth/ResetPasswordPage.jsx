import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import useIsMobile from '../../hooks/useIsMobile';

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

const ResetPasswordPage = () => {
  const isMobile        = useIsMobile();
  const navigate        = useNavigate();
  const [searchParams]  = useSearchParams();
  const token           = searchParams.get('token');

  const [form, setForm]           = useState({ password: '', confirmPass: '' });
  const [showPass, setShowPass]   = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [done, setDone]           = useState(false);

  if (!token) {
    return (
      <div style={s.root}>
        <div style={s.blobTop} /><div style={s.blobBottom} />
        <div style={{ ...s.card, padding: isMobile ? '28px 20px' : '44px 40px', maxWidth: 440, width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', marginBottom: 8, fontFamily: 'Geist, sans-serif' }}>Invalid link</h2>
          <p style={{ fontSize: 13, color: '#64748B', marginBottom: 24 }}>This password reset link is missing or invalid.</p>
          <Link to="/forgot-password" style={s.btn}>Request a new link</Link>
        </div>
        <style>{css}</style>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (form.password !== form.confirmPass) { setError('Passwords do not match.'); return; }
    setLoading(true); setError('');
    try {
      await api.patch('/auth/reset-password', { token, password: form.password });
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Link expired or invalid. Please request a new one.');
    }
    setLoading(false);
  };

  return (
    <div style={s.root}>
      <div style={s.blobTop} /><div style={s.blobBottom} />

      <div style={{ ...s.card, padding: isMobile ? '28px 20px' : '44px 40px', width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img src="/lasuconnect-logo.png" alt="LASU"
            style={{ width: 52, height: 52, objectFit: 'contain', margin: '0 auto 14px', display: 'block' }} />
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', marginBottom: 6, fontFamily: 'Geist, sans-serif' }}>
            Set new password
          </h2>
          <p style={{ fontSize: 13, color: '#64748B' }}>Must be at least 6 characters.</p>
        </div>

        {done ? (
          <div>
            <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 12, padding: '16px 18px', textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#15803D', marginBottom: 4 }}>Password updated</div>
              <div style={{ fontSize: 13, color: '#374151' }}>You can now sign in with your new password.</div>
            </div>
            <button onClick={() => navigate('/login')} style={s.btn}>Go to Sign In</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {error && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#DC2626', display: 'flex', gap: 8 }}>
                <span style={{ flexShrink: 0, fontWeight: 700 }}>!</span>
                <span>{error}</span>
              </div>
            )}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>New password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPass ? 'text' : 'password'} value={form.password}
                  onChange={e => { setError(''); setForm(p => ({ ...p, password: e.target.value })); }}
                  placeholder="Min. 6 characters" style={{ ...inputStyle, paddingRight: 40 }} />
                <button type="button" onClick={() => setShowPass(p => !p)}
                  style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex', alignItems: 'center' }}>
                  {showPass ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Confirm password</label>
              <div style={{ position: 'relative' }}>
                <input type={showConfirm ? 'text' : 'password'} value={form.confirmPass}
                  onChange={e => { setError(''); setForm(p => ({ ...p, confirmPass: e.target.value })); }}
                  placeholder="Repeat password"
                  style={{ ...inputStyle, paddingRight: 40, borderColor: form.confirmPass && form.password !== form.confirmPass ? '#EF4444' : '#E2E8F0' }} />
                <button type="button" onClick={() => setShowConfirm(p => !p)}
                  style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex', alignItems: 'center' }}>
                  {showConfirm ? <EyeOff /> : <Eye />}
                </button>
              </div>
              {form.confirmPass && form.password !== form.confirmPass && (
                <div style={{ fontSize: 12, color: '#EF4444', marginTop: 4 }}>Passwords do not match</div>
              )}
            </div>
            <button type="submit" disabled={loading}
              style={{ ...s.btn, opacity: loading ? 0.75 : 1, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {loading ? (
                <><div style={{ width: 15, height: 15, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'lc-spin 0.7s linear infinite' }} />Updating…</>
              ) : 'Update Password'}
            </button>
            <Link to="/login" style={{ textAlign: 'center', fontSize: 13, color: '#64748B', textDecoration: 'none' }}>
              ← Back to Sign In
            </Link>
          </form>
        )}
      </div>
      <style>{css}</style>
    </div>
  );
};

const inputStyle = {
  width: '100%', padding: '11px 14px', border: '1.5px solid #E2E8F0',
  borderRadius: 10, fontSize: 14, color: '#0F172A', background: '#F8FAFC',
  fontFamily: 'DM Sans, sans-serif',
};

const s = {
  root:       { minHeight: '100vh', background: '#0a0f1e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans, sans-serif', position: 'relative', overflow: 'hidden', padding: '16px' },
  blobTop:    { position: 'absolute', top: '-120px', left: '-80px', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.22) 0%, transparent 70%)', pointerEvents: 'none' },
  blobBottom: { position: 'absolute', bottom: '-150px', right: '-100px', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(15,110,86,0.14) 0%, transparent 70%)', pointerEvents: 'none' },
  card:       { background: '#ffffff', borderRadius: 20, boxShadow: '0 28px 72px rgba(0,0,0,0.55)', position: 'relative', zIndex: 1, animation: 'fadeUp 0.45s ease forwards' },
  btn:        { display: 'block', width: '100%', padding: '12px', background: 'linear-gradient(135deg, #1D4ED8, #2563EB)', color: 'white', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, textAlign: 'center', textDecoration: 'none', fontFamily: 'Geist, sans-serif', boxShadow: '0 4px 14px rgba(37,99,235,0.4)', cursor: 'pointer' },
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Geist:wght@600;700;800&family=DM+Sans:wght@400;500;600&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  input:focus { outline: 2px solid #2563EB; outline-offset: 0; border-radius: 10px; }
  @keyframes lc-spin { to { transform: rotate(360deg); } }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
`;

export default ResetPasswordPage;
