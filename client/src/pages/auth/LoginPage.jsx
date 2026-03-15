import { useState } from 'react';
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

  const handleChange = (e) => {
    clearError();
    setFormError('');
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) { setFormError('Please fill in all fields.'); return; }
    const result = await login(form);
    if (result.success) navigate('/');
  };

  return (
    <div style={styles.root}>
      {/* Background blobs */}
      <div style={styles.blobTop} />
      <div style={styles.blobBottom} />

      <div style={{ ...styles.wrapper, flexDirection: isMobile ? 'column' : 'row', borderRadius: isMobile ? 20 : 24, maxWidth: isMobile ? 440 : 960 }}>

        {/* ── Left / Top branding panel ── */}
        <div style={{ ...styles.leftPanel, padding: isMobile ? '28px 24px' : '48px 40px', minWidth: isMobile ? 'unset' : 300 }}>
          <div style={styles.brandMark}>
            <span style={{ ...styles.brandL, fontSize: isMobile ? 36 : 56 }}>L</span>
            <span style={{ ...styles.brandRest, fontSize: isMobile ? 22 : 32 }}>ASU</span>
          </div>
          <h1 style={{ ...styles.brandTitle, fontSize: isMobile ? 18 : 28, marginBottom: isMobile ? 8 : 16 }}>Connect</h1>
          <p style={{ ...styles.brandTagline, fontSize: isMobile ? 13 : 15, marginBottom: isMobile ? 16 : 36 }}>
            Your campus. Your community.<br />Built exclusively for LASU students.
          </p>

          {/* Hide features list on very small screens to save space */}
          {!isMobile && (
            <div style={styles.featureList}>
              {[
                { icon: '🎓', text: 'Academic collaboration & course hubs' },
                { icon: '🎬', text: 'Reels, live streams & campus trends' },
                { icon: '💬', text: 'DMs, group chats & study groups' },
                { icon: '🔒', text: 'Verified LASU students only' },
              ].map((f, i) => (
                <div key={i} style={styles.featureItem}>
                  <span style={styles.featureIcon}>{f.icon}</span>
                  <span style={styles.featureText}>{f.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* Compact features row on mobile */}
          {isMobile && (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {['🎓 Courses', '🎬 Reels', '💬 Chats', '🔒 Verified'].map(f => (
                <span key={f} style={{ fontSize: 11, color: '#BFDBFE', background: 'rgba(255,255,255,0.08)', borderRadius: 20, padding: '3px 10px', fontWeight: 600 }}>
                  {f}
                </span>
              ))}
            </div>
          )}

          <div style={{ ...styles.lasuBadge, marginTop: isMobile ? 14 : 40 }}>
            <span style={styles.lasuBadgeDot} />
            Lagos State University · Ojo
          </div>
        </div>

        {/* ── Right / Bottom form panel ── */}
        <div style={{ ...styles.rightPanel, width: isMobile ? '100%' : 420, padding: isMobile ? '28px 24px' : '40px 36px' }}>
          <div style={styles.formCard}>
            <div style={{ ...styles.formHeader, marginBottom: isMobile ? 20 : 28 }}>
              <div style={styles.formLogo}>LC</div>
              <h2 style={{ ...styles.formTitle, fontSize: isMobile ? 20 : 24 }}>Welcome back</h2>
              <p style={styles.formSubtitle}>Sign in to your LASUConnect account</p>
            </div>

            {(error || formError) && (
              <div style={styles.errorBanner}>
                <span>⚠️</span>
                <span>{error || formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Email address</label>
                <div style={styles.inputWrapper}>
                  <span style={styles.inputIcon}>✉️</span>
                  <input type="email" name="email" placeholder="you@lasu.edu.ng"
                    value={form.email} onChange={handleChange}
                    style={styles.input} autoComplete="email" />
                </div>
              </div>

              <div style={styles.fieldGroup}>
                <div style={styles.labelRow}>
                  <label style={styles.label}>Password</label>
                  <Link to="/forgot-password" style={styles.forgotLink}>Forgot password?</Link>
                </div>
                <div style={styles.inputWrapper}>
                  <span style={styles.inputIcon}>🔑</span>
                  <input type={showPassword ? 'text' : 'password'} name="password"
                    placeholder="Enter your password"
                    value={form.password} onChange={handleChange}
                    style={{ ...styles.input, paddingRight: '44px' }}
                    autoComplete="current-password" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={isLoading}
                style={{ ...styles.submitBtn, opacity: isLoading ? 0.7 : 1, cursor: isLoading ? 'not-allowed' : 'pointer' }}>
                {isLoading
                  ? <span style={styles.spinnerRow}><span style={styles.spinner} /> Signing in...</span>
                  : 'Sign In'
                }
              </button>
            </form>

            <div style={styles.divider}>
              <span style={styles.dividerLine} />
              <span style={styles.dividerText}>New to LASUConnect?</span>
              <span style={styles.dividerLine} />
            </div>

            <Link to="/register" style={styles.registerBtn}>Create your account</Link>

            <p style={styles.footerNote}>
              Only Lagos State University students with a valid LASU email can register.
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=DM+Sans:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input:focus { outline: 2px solid #2563EB; outline-offset: 0; border-radius: 10px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

const styles = {
  root: { minHeight: '100vh', background: '#0a0f1e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", position: 'relative', overflow: 'hidden', padding: '16px' },
  blobTop:    { position: 'absolute', top: '-120px', left: '-80px', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.25) 0%, transparent 70%)', pointerEvents: 'none' },
  blobBottom: { position: 'absolute', bottom: '-150px', right: '-100px', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)', pointerEvents: 'none' },
  wrapper: { display: 'flex', width: '100%', borderRadius: 24, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.6)', position: 'relative', zIndex: 1, animation: 'fadeUp 0.5s ease forwards' },
  leftPanel: { flex: 1, background: 'linear-gradient(145deg, #1a3a8a 0%, #0d2460 60%, #0a1840 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'center' },
  brandMark: { display: 'flex', alignItems: 'baseline', marginBottom: 4 },
  brandL:    { fontWeight: 800, color: '#60A5FA', fontFamily: "'Outfit', sans-serif", lineHeight: 1 },
  brandRest: { fontWeight: 700, color: '#93C5FD', fontFamily: "'Outfit', sans-serif", marginLeft: 2 },
  brandTitle: { fontWeight: 300, color: '#DBEAFE', fontFamily: "'Outfit', sans-serif", letterSpacing: 2 },
  brandTagline: { color: '#93C5FD', lineHeight: 1.7, opacity: 0.85 },
  featureList:  { display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 40 },
  featureItem:  { display: 'flex', alignItems: 'center', gap: 12 },
  featureIcon:  { fontSize: 18, width: 32, height: 32, background: 'rgba(255,255,255,0.08)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  featureText:  { fontSize: 13, color: '#BFDBFE', lineHeight: 1.4 },
  lasuBadge:    { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#60A5FA', background: 'rgba(96,165,250,0.1)', borderRadius: 20, padding: '6px 14px', width: 'fit-content', border: '1px solid rgba(96,165,250,0.2)' },
  lasuBadgeDot: { width: 7, height: 7, borderRadius: '50%', background: '#34D399', flexShrink: 0 },
  rightPanel:   { background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  formCard:     { width: '100%' },
  formHeader:   { textAlign: 'center' },
  formLogo:     { width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg, #1D4ED8, #2563EB)', color: 'white', fontWeight: 700, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontFamily: "'Outfit', sans-serif", boxShadow: '0 8px 20px rgba(37,99,235,0.35)' },
  formTitle:    { fontWeight: 700, color: '#0F172A', fontFamily: "'Outfit', sans-serif", marginBottom: 6 },
  formSubtitle: { fontSize: 14, color: '#64748B' },
  errorBanner:  { background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#DC2626', display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 20 },
  form:         { display: 'flex', flexDirection: 'column', gap: 18 },
  fieldGroup:   { display: 'flex', flexDirection: 'column', gap: 6 },
  labelRow:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  label:        { fontSize: 13, fontWeight: 600, color: '#374151' },
  forgotLink:   { fontSize: 12, color: '#2563EB', textDecoration: 'none', fontWeight: 500 },
  inputWrapper: { position: 'relative', display: 'flex', alignItems: 'center' },
  inputIcon:    { position: 'absolute', left: 12, fontSize: 15, pointerEvents: 'none', zIndex: 1 },
  input:        { width: '100%', padding: '11px 12px 11px 40px', border: '1.5px solid #E2E8F0', borderRadius: 10, fontSize: 14, color: '#0F172A', background: '#F8FAFC', outline: 'none', fontFamily: "'DM Sans', sans-serif" },
  eyeBtn:       { position: 'absolute', right: 10, background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 4 },
  submitBtn:    { width: '100%', padding: 12, background: 'linear-gradient(135deg, #1D4ED8, #2563EB)', color: 'white', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", boxShadow: '0 4px 14px rgba(37,99,235,0.4)', marginTop: 4 },
  spinnerRow:   { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 },
  spinner:      { width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' },
  divider:      { display: 'flex', alignItems: 'center', gap: 10, margin: '22px 0 16px' },
  dividerLine:  { flex: 1, height: 1, background: '#E2E8F0' },
  dividerText:  { fontSize: 12, color: '#94A3B8', whiteSpace: 'nowrap' },
  registerBtn:  { display: 'block', width: '100%', padding: 11, border: '1.5px solid #2563EB', borderRadius: 10, textAlign: 'center', color: '#2563EB', fontSize: 14, fontWeight: 600, textDecoration: 'none', fontFamily: "'Outfit', sans-serif", background: 'transparent' },
  footerNote:   { marginTop: 20, fontSize: 11.5, color: '#94A3B8', textAlign: 'center', lineHeight: 1.6 },
};

export default LoginPage;
