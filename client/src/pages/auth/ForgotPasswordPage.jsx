import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import useIsMobile from '../../hooks/useIsMobile';

const ForgotPasswordPage = () => {
  const isMobile = useIsMobile();
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [sent, setSent]       = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    setLoading(true); setError('');
    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div style={s.root}>
      <div style={s.blobTop} />
      <div style={s.blobBottom} />

      <div style={{ ...s.card, padding: isMobile ? '28px 20px' : '44px 40px', width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img src="/lasuconnect-logo.png" alt="LASU"
            style={{ width: 52, height: 52, objectFit: 'contain', margin: '0 auto 14px', display: 'block' }} />
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', marginBottom: 6, fontFamily: 'Geist, sans-serif' }}>
            Forgot password?
          </h2>
          <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6 }}>
            Enter your LASU email and we'll send you a reset link.
          </p>
        </div>

        {sent ? (
          <div>
            <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 12, padding: '16px 18px', textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📧</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#15803D', marginBottom: 4 }}>Check your inbox</div>
              <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
                We sent a password reset link to <strong>{email}</strong>. It expires in 10 minutes.
              </div>
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 8 }}>
                Don't see it? Check your <strong>Spam</strong> or <strong>Junk</strong> folder.
              </div>
            </div>
            <Link to="/login" style={s.btn}>Back to Sign In</Link>
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
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                Email address
              </label>
              <input
                type="email" value={email} onChange={e => { setError(''); setEmail(e.target.value); }}
                placeholder="you@student.lasu.edu.ng" autoComplete="email"
                style={inputStyle} />
            </div>
            <button type="submit" disabled={loading} style={{ ...s.btn, opacity: loading ? 0.75 : 1, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {loading ? (
                <><div style={{ width: 15, height: 15, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'lc-spin 0.7s linear infinite' }} /> Sending…</>
              ) : 'Send Reset Link'}
            </button>
            <Link to="/login" style={{ textAlign: 'center', fontSize: 13, color: '#64748B', textDecoration: 'none' }}>
              ← Back to Sign In
            </Link>
          </form>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@600;700;800&family=DM+Sans:wght@400;500;600&display=swap');
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
  fontFamily: 'DM Sans, sans-serif',
};

const s = {
  root:    { minHeight: '100vh', background: '#0a0f1e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans, sans-serif', position: 'relative', overflow: 'hidden', padding: '16px' },
  blobTop: { position: 'absolute', top: '-120px', left: '-80px', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.22) 0%, transparent 70%)', pointerEvents: 'none' },
  blobBottom: { position: 'absolute', bottom: '-150px', right: '-100px', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(15,110,86,0.14) 0%, transparent 70%)', pointerEvents: 'none' },
  card:    { background: '#ffffff', borderRadius: 20, boxShadow: '0 28px 72px rgba(0,0,0,0.55)', position: 'relative', zIndex: 1, animation: 'fadeUp 0.45s ease forwards' },
  btn:     { display: 'block', width: '100%', padding: '12px', background: 'linear-gradient(135deg, #1D4ED8, #2563EB)', color: 'white', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, textAlign: 'center', textDecoration: 'none', fontFamily: 'Geist, sans-serif', boxShadow: '0 4px 14px rgba(37,99,235,0.4)', cursor: 'pointer' },
};

export default ForgotPasswordPage;
