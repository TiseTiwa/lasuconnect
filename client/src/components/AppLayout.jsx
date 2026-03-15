import { useState, useEffect } from "react";
import { NavLink, useNavigate, Outlet } from "react-router-dom";
import useAuthStore from "../context/useAuthStore";
import { getSuggestions, toggleFollow } from "../services/usersService";
import { getUnreadCount } from "../services/notificationsService";
import { useSocket } from "../context/SocketContext";

const NAV = [
  { to: "/", icon: "🏠", label: "Home", exact: true },
  { to: "/reels", icon: "🎬", label: "Reels" },
  { to: "/courses", icon: "📚", label: "Courses" },
  { to: "/messages", icon: "💬", label: "Messages" },
  { to: "/search", icon: "🔍", label: "Search" },
  { to: "/live", icon: "🔴", label: "Live" },
  { to: "/notifications", icon: "🔔", label: "Notifications", hasBadge: true },
  { to: "/announcements", icon: "📢", label: "Announcements" },
];

// ── Suggestion mini card ───────────────────────────────────
const SuggestionCard = ({ user }) => {
  const navigate = useNavigate();
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const colors = [
    "#1D4ED8",
    "#7C3AED",
    "#DB2777",
    "#059669",
    "#D97706",
    "#DC2626",
  ];
  const color = colors[(user?.username?.charCodeAt(0) || 0) % colors.length];
  const initials = user.fullName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleFollow = async (e) => {
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    setFollowing((p) => !p);
    try {
      await toggleFollow(user.username);
    } catch {
      setFollowing((p) => !p);
    }
    setLoading(false);
  };

  return (
    <div
      style={s.suggCard}
      onClick={() => navigate(`/profile/${user.username}`)}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: user.avatarUrl ? "transparent" : color,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <span
            style={{
              color: "white",
              fontWeight: 700,
              fontSize: 12,
              fontFamily: "Geist, sans-serif",
            }}
          >
            {initials}
          </span>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={s.suggName}>{user.fullName}</div>
        <div style={s.suggMeta}>{user.department}</div>
      </div>
      <button
        onClick={handleFollow}
        disabled={loading}
        style={{ ...s.suggFollow, ...(following ? s.suggFollowing : {}) }}
      >
        {following ? "✓" : "+"}
      </button>
    </div>
  );
};

const AppLayout = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const socket = useSocket();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };
  const initials =
    user?.fullName
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "LC";

  // Load initial unread count
  useEffect(() => {
    getUnreadCount()
      .then((res) => setUnreadCount(res.data.data.count))
      .catch(() => {});

    getSuggestions()
      .then((res) => setSuggestions(res.data.data.suggestions))
      .catch(() => {});
  }, []);

  // Listen for new notifications via Socket.IO — increment badge
  useEffect(() => {
    if (!socket) return;
    const handler = () => setUnreadCount((c) => c + 1);
    socket.on("notification:new", handler);
    return () => socket.off("notification:new", handler);
  }, [socket]);

  // When user visits /notifications, reset badge
  const handleNotifClick = () => {
    setUnreadCount(0);
  };

  return (
    <div style={s.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        a { text-decoration: none; }
        .nav-link { display: flex; align-items: center; gap: 12px; padding: 10px 16px; border-radius: 12px; color: #64748B; font-size: 15px; font-weight: 500; transition: all 0.18s; cursor: pointer; font-family: 'DM Sans', sans-serif; position: relative; }
        .nav-link:hover { background: #F1F5F9; color: #0F172A; }
        .nav-link.active { background: #EFF6FF; color: #2563EB; font-weight: 700; }
        .nav-link.active .nav-icon { transform: scale(1.15); }
        .nav-icon { font-size: 20px; transition: transform 0.18s; width: 24px; text-align: center; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes badgePop { 0% { transform: scale(0); } 70% { transform: scale(1.2); } 100% { transform: scale(1); } }
        .page-enter { animation: fadeIn 0.3s ease forwards; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 4px; }
        @media (max-width: 900px) {
          .sidebar { display: none !important; }
          .right-panel { display: none !important; }
          .mobile-bar { display: flex !important; }
          .bottom-nav { display: flex !important; }
          .main-content { padding: 16px !important; }
        }
      `}</style>

      {/* ── Sidebar ── */}
      <aside className="sidebar" style={s.sidebar}>
        <div style={s.brand}>
          <div style={s.brandIcon}>LC</div>
          <div>
            <div style={s.brandName}>LASUConnect</div>
            <div style={s.brandSub}>Lagos State University</div>
          </div>
        </div>

        <nav style={s.nav}>
          {NAV.map(({ to, icon, label, exact, hasBadge }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                `nav-link${isActive ? " active" : ""}`
              }
              onClick={hasBadge ? handleNotifClick : undefined}
            >
              <span className="nav-icon">{icon}</span>
              <span style={{ flex: 1 }}>{label}</span>
              {/* Live notification badge */}
              {hasBadge && unreadCount > 0 && (
                <span style={s.badge}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div style={s.divider} />

        <NavLink
          to={`/profile/${user?.username}`}
          className="nav-link"
          style={{ marginBottom: 8 }}
        >
          <div style={s.avatarSmall}>
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt=""
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  borderRadius: "50%",
                }}
              />
            ) : (
              <span style={s.avatarInitials}>{initials}</span>
            )}
          </div>
          <div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "#0F172A",
                lineHeight: 1.2,
                fontFamily: "Geist, sans-serif",
              }}
            >
              {user?.fullName}
            </div>
            <div style={{ fontSize: 12, color: "#94A3B8" }}>
              @{user?.username}
            </div>
          </div>
        </NavLink>

        <button onClick={handleLogout} style={s.logoutBtn}>
          <span>🚪</span> Sign Out
        </button>
      </aside>

      {/* ── Main Content ── */}
      <main style={s.main}>
        {/* Mobile topbar */}
        <div className="mobile-bar" style={{ ...s.mobileBar, display: "none" }}>
          <div style={s.brand}>
            <div
              style={{ ...s.brandIcon, width: 32, height: 32, fontSize: 13 }}
            >
              LC
            </div>
            <span style={{ ...s.brandName, fontSize: 16 }}>LASUConnect</span>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <NavLink
              to="/search"
              style={{ fontSize: 20, textDecoration: "none" }}
            >
              🔍
            </NavLink>
            {/* Mobile notification bell */}
            <NavLink
              to="/notifications"
              onClick={handleNotifClick}
              style={{
                position: "relative",
                fontSize: 20,
                textDecoration: "none",
              }}
            >
              🔔
              {unreadCount > 0 && (
                <span
                  style={{
                    ...s.badge,
                    position: "absolute",
                    top: -6,
                    right: -6,
                    fontSize: 9,
                    minWidth: 16,
                    height: 16,
                    padding: "0 4px",
                  }}
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </NavLink>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={s.hamburger}
            >
              {mobileMenuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div style={s.mobileDrawer}>
            {NAV.map(({ to, icon, label, exact, hasBadge }) => (
              <NavLink
                key={to}
                to={to}
                end={exact}
                className={({ isActive }) =>
                  `nav-link${isActive ? " active" : ""}`
                }
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (hasBadge) handleNotifClick();
                }}
              >
                <span className="nav-icon">{icon}</span>
                <span style={{ flex: 1 }}>{label}</span>
                {hasBadge && unreadCount > 0 && (
                  <span style={s.badge}>{unreadCount}</span>
                )}
              </NavLink>
            ))}
            <button
              onClick={handleLogout}
              style={{ ...s.logoutBtn, margin: "8px 0 0" }}
            >
              <span>🚪</span> Sign Out
            </button>
          </div>
        )}

        <div className="main-content page-enter" style={s.content}>
          <Outlet />
        </div>
      </main>

      {/* ── Right Panel ── */}
      <aside className="right-panel" style={s.rightPanel}>
        {/* User card */}
        <div style={s.userCard}>
          <div style={s.bigAvatar}>
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt=""
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  borderRadius: "50%",
                }}
              />
            ) : (
              <span style={s.bigAvatarText}>{initials}</span>
            )}
          </div>
          <NavLink
            to={`/profile/${user?.username}`}
            style={{ textDecoration: "none" }}
          >
            <div style={s.userName}>{user?.fullName}</div>
          </NavLink>
          <div style={s.userHandle}>@{user?.username}</div>
          <div style={s.userMeta}>
            <span style={s.metaBadge}>🎓 {user?.level} Level</span>
            <span style={s.metaBadge}>📚 {user?.department}</span>
          </div>
        </div>

        {/* Stats */}
        <div style={s.statsCard}>
          <div style={s.statsTitle}>Your Stats</div>
          <div style={s.statsGrid}>
            {[
              { label: "Followers", value: user?.followersCount || 0 },
              { label: "Following", value: user?.followingCount || 0 },
            ].map(({ label, value }) => (
              <div key={label} style={s.statItem}>
                <div style={s.statNum}>{value}</div>
                <div style={s.statLabel}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div style={s.suggestionsCard}>
            <div style={s.suggestionsHeader}>
              <span style={s.statsTitle}>👥 People you may know</span>
              <NavLink
                to="/search"
                style={{
                  fontSize: 12,
                  color: "#2563EB",
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                See all
              </NavLink>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {suggestions.slice(0, 4).map((u) => (
                <SuggestionCard key={u._id} user={u} />
              ))}
            </div>
          </div>
        )}

        {/* Campus notice */}
        <div style={s.noticeCard}>
          <div style={s.noticeHeader}>📢 Campus</div>
          <p style={s.noticeText}>
            Welcome to LASUConnect! Explore courses, connect with classmates,
            and stay updated on campus life.
          </p>
        </div>
      </aside>

      {/* ── Bottom Mobile Nav ── */}
      <nav className="bottom-nav" style={{ ...s.bottomNav, display: "none" }}>
        {[
          { to: "/", icon: "🏠", exact: true },
          { to: "/reels", icon: "🎬" },
          { to: "/search", icon: "🔍" },
          { to: "/messages", icon: "💬" },
          { to: "/notifications", icon: "🔔", hasBadge: true },
        ].map(({ to, icon, exact, hasBadge }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            onClick={hasBadge ? handleNotifClick : undefined}
            style={({ isActive }) => ({
              ...s.bottomNavItem,
              color: isActive ? "#2563EB" : "#94A3B8",
              background: isActive ? "#EFF6FF" : "transparent",
            })}
          >
            <div style={{ position: "relative" }}>
              <span style={{ fontSize: 22 }}>{icon}</span>
              {hasBadge && unreadCount > 0 && (
                <span
                  style={{
                    ...s.badge,
                    position: "absolute",
                    top: -6,
                    right: -8,
                    fontSize: 9,
                    minWidth: 16,
                    height: 16,
                    padding: "0 4px",
                  }}
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
          </NavLink>
        ))}

        {/* Profile avatar — navigates to own profile */}
        <NavLink
          to={`/profile/${user?.username}`}
          style={({ isActive }) => ({
            ...s.bottomNavItem,
            color: isActive ? "#2563EB" : "#94A3B8",
            background: isActive ? "#EFF6FF" : "transparent",
          })}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              overflow: "hidden",
              border: "2px solid currentColor",
              background: user?.avatarUrl ? "transparent" : "#2563EB",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <span
                style={{
                  color: "white",
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: "Geist, sans-serif",
                }}
              >
                {user?.fullName
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2) || "?"}
              </span>
            )}
          </div>
        </NavLink>
      </nav>
    </div>
  );
};

// ─── Styles ───────────────────────────────────────────────
const s = {
  root: {
    display: "flex",
    minHeight: "100vh",
    background: "#F8FAFC",
    fontFamily: "'DM Sans', sans-serif",
  },
  sidebar: {
    width: 260,
    background: "white",
    borderRight: "1px solid #E2E8F0",
    padding: "24px 16px",
    display: "flex",
    flexDirection: "column",
    position: "sticky",
    top: 0,
    height: "100vh",
    overflowY: "auto",
    flexShrink: 0,
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 28,
    padding: "0 8px",
  },
  brandIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    background: "linear-gradient(135deg, #1D4ED8, #3B82F6)",
    color: "white",
    fontWeight: 800,
    fontSize: 15,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "Geist, sans-serif",
    flexShrink: 0,
  },
  brandName: {
    fontFamily: "Geist, sans-serif",
    fontWeight: 800,
    fontSize: 18,
    color: "#0F172A",
    lineHeight: 1.1,
  },
  brandSub: { fontSize: 10, color: "#94A3B8", fontWeight: 500 },
  nav: { display: "flex", flexDirection: "column", gap: 2, flex: 1 },
  divider: { height: 1, background: "#E2E8F0", margin: "16px 0" },
  avatarSmall: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #1D4ED8, #60A5FA)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    flexShrink: 0,
  },
  avatarInitials: {
    color: "white",
    fontWeight: 700,
    fontSize: 13,
    fontFamily: "Geist, sans-serif",
  },
  logoutBtn: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 16px",
    borderRadius: 12,
    border: "none",
    background: "none",
    color: "#EF4444",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    width: "100%",
  },

  // Notification badge
  badge: {
    background: "#EF4444",
    color: "white",
    borderRadius: 20,
    padding: "1px 6px",
    fontSize: 10,
    fontWeight: 800,
    minWidth: 18,
    height: 18,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "Geist, sans-serif",
    animation: "badgePop 0.3s ease",
    lineHeight: 1,
  },

  main: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column" },
  content: {
    flex: 1,
    padding: "24px",
    maxWidth: 680,
    margin: "0 auto",
    width: "100%",
  },
  mobileBar: {
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    background: "white",
    borderBottom: "1px solid #E2E8F0",
    position: "sticky",
    top: 0,
    zIndex: 50,
  },
  hamburger: {
    background: "none",
    border: "none",
    fontSize: 20,
    cursor: "pointer",
    color: "#0F172A",
  },
  mobileDrawer: {
    background: "white",
    borderBottom: "1px solid #E2E8F0",
    padding: "12px 16px",
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },

  rightPanel: {
    width: 280,
    padding: "24px 16px",
    display: "flex",
    flexDirection: "column",
    gap: 16,
    flexShrink: 0,
    position: "sticky",
    top: 0,
    height: "100vh",
    overflowY: "auto",
  },
  userCard: {
    background: "white",
    borderRadius: 16,
    padding: 20,
    textAlign: "center",
    border: "1px solid #E2E8F0",
  },
  bigAvatar: {
    width: 64,
    height: 64,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #1D4ED8, #60A5FA)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 12px",
    overflow: "hidden",
  },
  bigAvatarText: {
    color: "white",
    fontWeight: 800,
    fontSize: 22,
    fontFamily: "Geist, sans-serif",
  },
  userName: {
    fontFamily: "Geist, sans-serif",
    fontWeight: 700,
    fontSize: 15,
    color: "#0F172A",
    marginBottom: 2,
  },
  userHandle: { fontSize: 12, color: "#94A3B8", marginBottom: 10 },
  userMeta: {
    display: "flex",
    gap: 6,
    justifyContent: "center",
    flexWrap: "wrap",
  },
  metaBadge: {
    background: "#F1F5F9",
    borderRadius: 20,
    padding: "3px 10px",
    fontSize: 11,
    color: "#475569",
    fontWeight: 600,
  },
  statsCard: {
    background: "white",
    borderRadius: 16,
    padding: 16,
    border: "1px solid #E2E8F0",
  },
  statsTitle: {
    fontFamily: "Geist, sans-serif",
    fontWeight: 700,
    fontSize: 13,
    color: "#0F172A",
    marginBottom: 12,
  },
  statsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
  statItem: {
    textAlign: "center",
    background: "#F8FAFC",
    borderRadius: 10,
    padding: "10px 6px",
  },
  statNum: {
    fontFamily: "Geist, sans-serif",
    fontWeight: 800,
    fontSize: 20,
    color: "#2563EB",
  },
  statLabel: { fontSize: 11, color: "#94A3B8", fontWeight: 600, marginTop: 2 },
  suggestionsCard: {
    background: "white",
    borderRadius: 16,
    padding: 16,
    border: "1px solid #E2E8F0",
  },
  suggestionsHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  suggCard: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 4px",
    cursor: "pointer",
    borderRadius: 10,
    transition: "background 0.15s",
  },
  suggName: {
    fontFamily: "Geist, sans-serif",
    fontWeight: 600,
    fontSize: 13,
    color: "#0F172A",
    lineHeight: 1.2,
  },
  suggMeta: { fontSize: 11, color: "#94A3B8" },
  suggFollow: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    border: "none",
    background: "#2563EB",
    color: "white",
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    transition: "all 0.15s",
  },
  suggFollowing: { background: "#F1F5F9", color: "#374151", fontSize: 12 },
  noticeCard: {
    background: "linear-gradient(135deg, #EFF6FF, #DBEAFE)",
    borderRadius: 16,
    padding: 16,
    border: "1px solid #BFDBFE",
  },
  noticeHeader: {
    fontFamily: "Geist, sans-serif",
    fontWeight: 700,
    fontSize: 13,
    color: "#1D4ED8",
    marginBottom: 8,
  },
  noticeText: { fontSize: 12.5, color: "#3B5FBA", lineHeight: 1.6 },
  bottomNav: {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    background: "white",
    borderTop: "1px solid #E2E8F0",
    padding: "8px 0",
    zIndex: 100,
    justifyContent: "space-around",
  },
  bottomNavItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "6px 12px",
    borderRadius: 10,
    transition: "all 0.15s",
  },
};

export default AppLayout;
