import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../../context/useAuthStore';
import useIsMobile from '../../hooks/useIsMobile';

const LoginPage = () => {
  const navigate  = useNavigate();
  const isMobile  = useIsMobile();
  const { login, isLoading, error, clearError } = useAuthStore();

  const [form, setForm]               = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError]     = useState('');

  // Clear any stale token so restoreSession doesn't auto-login
  // The refresh cookie is httpOnly and can't be cleared from JS,
  // but without an accessToken, restoreSession exits early.
  useEffect(() => {
    localStorage.removeItem('accessToken');
    sessionStorage.removeItem('lc_session');
  }, []);

  const handleChange = (e) => {
    clearError(); setFormError('');
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) { setFormError('Please fill in all fields.'); return; }
    const result = await login(form);
    if (result.success) navigate('/');
  };

  return (
    <div style={s.root}>
      <div style={s.blobTop} />
      <div style={s.blobBottom} />

      <div style={{ ...s.wrapper, flexDirection: isMobile ? 'column' : 'row', maxWidth: isMobile ? 420 : 960, borderRadius: isMobile ? 20 : 24 }}>

        {/* ── Left branding panel ── */}
        <div style={{ ...s.leftPanel, padding: isMobile ? '24px 20px' : '48px 40px' }}>
          {/* Logo mark */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: isMobile ? 12 : 32 }}>
            <img src="/lasuconnect-logo.png" alt="LASU Logo"
              style={{ width: isMobile ? 36 : 44, height: isMobile ? 36 : 44, objectFit: 'contain', flexShrink: 0 }} />
            <div>
              <div style={{ fontFamily: 'var(--font-display, Geist, sans-serif)', fontWeight: 800, fontSize: isMobile ? 17 : 22, color: '#DBEAFE', letterSpacing: '-0.02em', lineHeight: 1 }}>LASUConnect</div>
              {!isMobile && <div style={{ fontSize: 11, color: '#93C5FD', marginTop: 3, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Lagos State University</div>}
            </div>
          </div>

          {!isMobile && (
            <>
              <h2 style={{ fontSize: 28, fontWeight: 300, color: '#BFDBFE', marginBottom: 12, lineHeight: 1.3, letterSpacing: '-0.01em' }}>
                Your campus.<br />Your community.
              </h2>
              <p style={{ fontSize: 14, color: '#93C5FD', lineHeight: 1.7, marginBottom: 32, opacity: 0.85 }}>
                Built exclusively for LASU students and staff. Study, connect, and stay on top of what matters.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
                {[
                  ['Academic hub', 'Course hubs, handbooks, daily quiz'],
                  ['Campus social', 'Feed, reels, live streaming'],
                  ['Direct messages', 'DMs, group chats, study groups'],
                  ['Verified only',  'LASU emails only — no bots'],
                ].map(([title, desc]) => (
                  <div key={title} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#60A5FA', flexShrink: 0, marginTop: 7 }} />
                    <div>
                      <span style={{ fontSize: 13, color: '#DBEAFE', fontWeight: 600 }}>{title}</span>
                      <span style={{ fontSize: 12, color: '#93C5FD', marginLeft: 6 }}>{desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 11, color: '#60A5FA', background: 'rgba(96,165,250,0.1)', borderRadius: 20, padding: '5px 12px', border: '1px solid rgba(96,165,250,0.2)' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34D399', flexShrink: 0 }} />
            Lagos State University · Ojo Campus
          </div>
        </div>

        {/* ── Right form panel ── */}
        <div style={{ ...s.rightPanel, padding: isMobile ? '24px 20px' : '44px 36px' }}>
          <div style={{ marginBottom: isMobile ? 20 : 28, textAlign: 'center' }}>
            <img src="/lasuconnect-logo.png" alt="LASU"
              style={{ width: 52, height: 52, objectFit: 'contain', margin: '0 auto 14px', display: 'block' }} />
            <h2 style={{ fontSize: isMobile ? 20 : 23, fontWeight: 700, color: '#0F172A', marginBottom: 5, fontFamily: 'var(--font-display, Geist, sans-serif)' }}>Welcome back</h2>
            <p style={{ fontSize: 13, color: '#64748B' }}>Sign in to your LASUConnect account</p>
          </div>

          {(error || formError) && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#DC2626', display: 'flex', gap: 8, marginBottom: 18 }}>
              <span style={{ flexShrink: 0, fontWeight: 700 }}>!</span>
              <span>{error || formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Email address</label>
              <input type="email" name="email" placeholder="you@lasu.edu.ng" value={form.email}
                onChange={handleChange} autoComplete="email"
                style={inputStyle} />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Password</label>
                <Link to="/forgot-password" style={{ fontSize: 12, color: '#2563EB', textDecoration: 'none', fontWeight: 500 }}>Forgot?</Link>
              </div>
              <div style={{ position: 'relative' }}>
                <input type={showPassword ? 'text' : 'password'} name="password" placeholder="Enter your password"
                  value={form.password} onChange={handleChange} autoComplete="current-password"
                  style={{ ...inputStyle, paddingRight: 42 }} />
                <button type="button" onClick={() => setShowPassword(p => !p)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: 13, fontWeight: 600 }}>
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <button type="submit" disabled={isLoading}
              style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #1D4ED8, #2563EB)', color: 'white', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.75 : 1, fontFamily: 'var(--font-display, Geist, sans-serif)', boxShadow: '0 4px 14px rgba(37,99,235,0.4)', marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {isLoading ? (
                <>
                  <div style={{ width: 15, height: 15, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'lc-spin 0.7s linear infinite' }} />
                  Signing in…
                </>
              ) : 'Sign In'}
            </button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0 16px' }}>
            <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
            <span style={{ fontSize: 12, color: '#94A3B8' }}>New to LASUConnect?</span>
            <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
          </div>

          <Link to="/register" style={{ display: 'block', width: '100%', padding: '11px', border: '1.5px solid #2563EB', borderRadius: 10, textAlign: 'center', color: '#2563EB', fontSize: 14, fontWeight: 600, textDecoration: 'none', fontFamily: 'var(--font-display, Geist, sans-serif)' }}>
            Create your account
          </Link>

          <p style={{ marginTop: 16, fontSize: 11.5, color: '#94A3B8', textAlign: 'center', lineHeight: 1.6 }}>
            Only Lagos State University students with a valid LASU email can register.
          </p>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&family=DM+Sans:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input:focus { outline: 2px solid #2563EB; outline-offset: 0; border-radius: 10px; }
        @keyframes lc-spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

const inputStyle = {
  width: '100%', padding: '11px 14px', border: '1.5px solid #E2E8F0',
  borderRadius: 10, fontSize: 14, color: '#0F172A', background: '#F8FAFC',
  fontFamily: 'var(--font-body, DM Sans, sans-serif)',
};

const s = {
  root:       { minHeight: '100vh', background: '#0a0f1e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans, sans-serif', position: 'relative', overflow: 'hidden', padding: '16px' },
  blobTop:    { position: 'absolute', top: '-120px', left: '-80px', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.22) 0%, transparent 70%)', pointerEvents: 'none' },
  blobBottom: { position: 'absolute', bottom: '-150px', right: '-100px', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(15,110,86,0.14) 0%, transparent 70%)', pointerEvents: 'none' },
  wrapper:    { display: 'flex', width: '100%', borderRadius: 24, overflow: 'hidden', boxShadow: '0 28px 72px rgba(0,0,0,0.55)', position: 'relative', zIndex: 1, animation: 'fadeUp 0.45s ease forwards' },
  leftPanel:  { flex: 1, background: 'linear-gradient(145deg, #1a3a8a 0%, #0d2460 60%, #0a1840 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 },
  rightPanel: { background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' },
};

export default LoginPage;
