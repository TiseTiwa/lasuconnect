import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuthStore from '../context/useAuthStore';

// ── ProtectedRoute ─────────────────────────────────────────
// Blocks unauthenticated users — redirects to /login
// Also forces handbook upload for users who haven't done it yet
const ProtectedRoute = () => {
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-page, #F0F7F4)',
        flexDirection: 'column',
        gap: 16,
      }}>
        <div style={{
          width: 36, height: 36,
          border: '3px solid var(--border, #E2E8F0)',
          borderTopColor: 'var(--brand, #0F6E56)',
          borderRadius: '50%',
          animation: 'lc-spin 0.7s linear infinite',
        }} />
        <span style={{
          fontSize: 13,
          color: 'var(--text-tertiary, #8A9EAD)',
          fontFamily: 'var(--font-body, DM Sans, sans-serif)',
        }}>
          Loading LASUConnect...
        </span>
        <style>{`@keyframes lc-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // Lecturers and admins skip handbook requirement
  const handbookExempt = ['lecturer', 'admin', 'super_admin'].includes(user?.role);

  // Force handbook upload for students/course_reps who haven't confirmed one yet
  if (!handbookExempt && !user?.hasHandbook && location.pathname !== '/handbook') {
    return <Navigate to="/handbook" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;

// ── PublicRoute ────────────────────────────────────────────
// Blocks authenticated users from seeing login/register
// Usage: wrap LoginPage and RegisterPage with this
export const PublicRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) return null; // let ProtectedRoute handle the spinner

  // Already logged in — send to feed
  return isAuthenticated ? <Navigate to="/" replace /> : children;
};
