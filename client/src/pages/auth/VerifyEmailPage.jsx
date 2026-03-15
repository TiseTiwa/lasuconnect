import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../../services/api";

const VerifyEmailPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email || "your LASU email";

  const [resent, setResent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleResend = async () => {
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/resend-verification", { email });
      setResent(true);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to resend. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.root}>
      <div style={styles.blob1} />
      <div style={styles.blob2} />

      <div style={styles.card}>
        {/* Animated envelope */}
        <div style={styles.iconWrap}>
          <div style={styles.iconCircle}>
            <span style={styles.icon}>✉️</span>
          </div>
          <div style={styles.iconRing} />
        </div>

        <h1 style={styles.title}>Check your inbox</h1>
        <p style={styles.body}>We sent a verification link to:</p>
        <div style={styles.emailBadge}>{email}</div>
        <p style={styles.body2}>
          Click the link in the email to verify your account and start using
          LASUConnect.
        </p>

        {/* Steps */}
        <div style={styles.steps}>
          {[
            { num: "1", text: "Open your LASU email inbox" },
            { num: "2", text: "Find the email from LASUConnect" },
            { num: "3", text: 'Click "Verify my account"' },
          ].map((s) => (
            <div key={s.num} style={styles.stepRow}>
              <div style={styles.stepNum}>{s.num}</div>
              <span style={styles.stepText}>{s.text}</span>
            </div>
          ))}
        </div>

        {error && <div style={styles.errorBanner}>⚠️ {error}</div>}

        {resent ? (
          <div style={styles.successBanner}>
            ✅ Verification email resent successfully!
          </div>
        ) : (
          <div style={styles.resendArea}>
            <p style={styles.resendText}>Didn't receive it?</p>
            <button
              onClick={handleResend}
              disabled={loading}
              style={styles.resendBtn}
            >
              {loading ? "Sending..." : "Resend verification email"}
            </button>
          </div>
        )}

        <div style={styles.bottomLinks}>
          <Link to="/login" style={styles.link}>
            ← Back to Sign In
          </Link>
          <span style={styles.sep}>·</span>
          <Link to="/register" style={styles.link}>
            Wrong email?
          </Link>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800;900&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { transform: scale(1); opacity: 0.6; } 50% { transform: scale(1.15); opacity: 0.2; } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
      `}</style>
    </div>
  );
};

const styles = {
  root: {
    minHeight: "100vh",
    background: "#0a0f1e",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'DM Sans', sans-serif",
    position: "relative",
    overflow: "hidden",
    padding: "32px 16px",
  },
  blob1: {
    position: "absolute",
    top: "-150px",
    right: "-100px",
    width: "500px",
    height: "500px",
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(37,99,235,0.2) 0%, transparent 70%)",
    pointerEvents: "none",
  },
  blob2: {
    position: "absolute",
    bottom: "-100px",
    left: "-100px",
    width: "400px",
    height: "400px",
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)",
    pointerEvents: "none",
  },

  card: {
    background: "white",
    borderRadius: "24px",
    padding: "44px 40px",
    maxWidth: "460px",
    width: "100%",
    textAlign: "center",
    boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
    animation: "fadeUp 0.5s ease forwards",
    position: "relative",
    zIndex: 1,
  },

  iconWrap: {
    position: "relative",
    width: "90px",
    height: "90px",
    margin: "0 auto 28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircle: {
    width: "80px",
    height: "80px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #EFF6FF, #DBEAFE)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    animation: "float 3s ease-in-out infinite",
    position: "relative",
    zIndex: 1,
  },
  icon: { fontSize: "36px" },
  iconRing: {
    position: "absolute",
    inset: "-5px",
    borderRadius: "50%",
    border: "3px solid rgba(37,99,235,0.15)",
    animation: "pulse 2s ease-in-out infinite",
  },

  title: {
    fontSize: "26px",
    fontWeight: 700,
    color: "#0F172A",
    fontFamily: "'Geist', sans-serif",
    marginBottom: "10px",
  },
  body: { fontSize: "14px", color: "#64748B", marginBottom: "10px" },
  emailBadge: {
    display: "inline-block",
    background: "#EFF6FF",
    color: "#1D4ED8",
    padding: "6px 16px",
    borderRadius: "20px",
    fontSize: "13.5px",
    fontWeight: 600,
    margin: "0 0 14px",
    border: "1px solid #BFDBFE",
  },
  body2: {
    fontSize: "13.5px",
    color: "#64748B",
    lineHeight: 1.6,
    marginBottom: "28px",
  },

  steps: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    background: "#F8FAFC",
    borderRadius: "14px",
    padding: "18px",
    marginBottom: "24px",
    textAlign: "left",
  },
  stepRow: { display: "flex", alignItems: "center", gap: "12px" },
  stepNum: {
    width: "26px",
    height: "26px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #1D4ED8, #2563EB)",
    color: "white",
    fontSize: "12px",
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  stepText: { fontSize: "13px", color: "#374151" },

  errorBanner: {
    background: "#FEF2F2",
    border: "1px solid #FECACA",
    borderRadius: "10px",
    padding: "10px 14px",
    fontSize: "13px",
    color: "#DC2626",
    marginBottom: "16px",
  },
  successBanner: {
    background: "#F0FDF4",
    border: "1px solid #BBF7D0",
    borderRadius: "10px",
    padding: "10px 14px",
    fontSize: "13px",
    color: "#16A34A",
    marginBottom: "16px",
  },

  resendArea: { marginBottom: "24px" },
  resendText: { fontSize: "13px", color: "#94A3B8", marginBottom: "8px" },
  resendBtn: {
    background: "none",
    border: "1.5px solid #E2E8F0",
    borderRadius: "8px",
    padding: "8px 18px",
    fontSize: "13px",
    fontWeight: 600,
    color: "#2563EB",
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    transition: "border-color 0.2s",
  },

  bottomLinks: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
  },
  link: {
    fontSize: "13px",
    color: "#2563EB",
    textDecoration: "none",
    fontWeight: 500,
  },
  sep: { color: "#CBD5E1", fontSize: "14px" },
};

export default VerifyEmailPage;
