import { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import useAuthStore from "../context/useAuthStore";
import { useSocket } from "../context/SocketContext";
import { useTheme } from "../context/ThemeContext";
import LCIcon from "./LCIcon";
import LASULogo from "./LASULogo";
import { getUnreadCount } from "../services/notificationsService";
import { getConversations } from "../services/messagesService";

// ── Notification count ─────────────────────────────────────
const useUnreadCount = (socket) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    getUnreadCount()
      .then(res => setCount(res.data?.data?.count ?? 0))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handler = () => setCount((c) => c + 1);
    socket.on("notification:new", handler);
    return () => socket.off("notification:new", handler);
  }, [socket]);

  return { count, clear: () => setCount(0) };
};

// ── Unread message count ───────────────────────────────────
const useUnreadMessages = (socket) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    getConversations()
      .then(res => {
        const convs = res.data?.data?.conversations || [];
        const total = convs.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
        setCount(total);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handler = () => setCount((c) => c + 1);
    socket.on("message:notification", handler);
    return () => socket.off("message:notification", handler);
  }, [socket]);

  return { count, clear: () => setCount(0) };
};

// ── User avatar ────────────────────────────────────────────
const UserAvatar = ({ user, size = 28, active = false }) => {
  const initials =
    user?.fullName?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";
  const seeds = ["#0F6E56", "#7C3AED", "#DB2777", "#D97706", "#2563EB"];
  const bg = seeds[(user?.username?.charCodeAt(0) || 0) % seeds.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", overflow: "hidden",
      flexShrink: 0,
      border: active ? "2px solid var(--brand)" : "1.5px solid var(--border-sec)",
      background: user?.avatarUrl ? "transparent" : bg,
      display: "flex", alignItems: "center", justifyContent: "center",
      transition: "border-color var(--duration-fast) var(--ease-out)",
    }}>
      {user?.avatarUrl
        ? <img src={user.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : <span style={{ color: "white", fontSize: size * 0.34, fontWeight: 700, fontFamily: "var(--font-display)" }}>{initials}</span>
      }
    </div>
  );
};

// ── Theme toggle ───────────────────────────────────────────
const ThemeToggle = ({ compact = false }) => {
  const { mode, theme, setMode, toggleTheme } = useTheme();
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      <button onClick={toggleTheme} style={{
        width: 34, height: 34, borderRadius: "var(--radius-sm)",
        border: "0.5px solid var(--border-sec)", background: "var(--bg-surface)",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", transition: "all var(--duration-fast) var(--ease-out)",
        flexShrink: 0,
      }}>
        <LCIcon name={theme === "dark" ? "sun" : "moon"} size={15} color="var(--text-secondary)" />
      </button>

      {!compact && (
        <div style={{
          display: "flex", borderRadius: "var(--radius-sm)",
          border: "0.5px solid var(--border-sec)", overflow: "hidden",
          background: "var(--bg-surface)",
        }}>
          {[["academic", "📚"], ["social", "🌐"]].map(([m, emoji]) => (
            <button key={m} onClick={() => setMode(m)} style={{
              padding: "6px 10px", border: "none", cursor: "pointer",
              background: mode === m ? "var(--brand)" : "transparent",
              color: mode === m ? "var(--text-inverse)" : "var(--text-tertiary)",
              fontSize: 12, fontWeight: 600, fontFamily: "var(--font-body)",
              transition: "all var(--duration-fast) var(--ease-out)",
            }}>
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Mode card (right panel) ────────────────────────────────
const ModeCard = () => {
  const { mode, setMode } = useTheme();
  return (
    <div className="lc-card" style={{ padding: "14px 16px", marginBottom: 16 }}>
      <div style={{
        fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)",
        marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em",
      }}>
        Current Mode
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {[["academic", "📚 Academic"], ["social", "🌐 Social"]].map(([m, label]) => (
          <button key={m} onClick={() => setMode(m)} style={{
            flex: 1, padding: "8px", borderRadius: "var(--radius-sm)",
            border: `1.5px solid ${mode === m ? "var(--brand)" : "var(--border)"}`,
            background: mode === m ? "var(--brand-light)" : "var(--bg-input)",
            color: mode === m ? "var(--brand)" : "var(--text-secondary)",
            fontSize: 12, fontWeight: 600, cursor: "pointer",
            fontFamily: "var(--font-body)",
            transition: "all var(--duration-fast) var(--ease-out)",
          }}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
};

// ── Main AppLayout ─────────────────────────────────────────
const AppLayout = () => {
  const { user, logout }  = useAuthStore();
  const socket    = useSocket();
  const navigate  = useNavigate();
  const { mode }  = useTheme();
  const { count: unreadCount, clear: clearNotifs }   = useUnreadCount(socket);
  const { count: unreadMessages, clear: clearMessages } = useUnreadMessages(socket);
  const [showMore, setShowMore] = useState(false);

  const isAdmin = ["admin", "super_admin"].includes(user?.role);

  const NAV = [
    { to: "/",              icon: "home",     label: "Home",     exact: true },
    { to: "/reels",         icon: "reels",    label: "Reels" },
    { to: "/search",        icon: "search",   label: "Search" },
    { to: "/messages",      icon: "messages", label: "Messages", badge: unreadMessages, onTap: clearMessages },
    { to: "/notifications", icon: "bell",     label: "Alerts",   badge: unreadCount,    onTap: clearNotifs },
  ];

  const SIDEBAR_EXTRA = [
    { to: "/live",          icon: "live",          label: "Live" },
    { to: "/courses",       icon: "courses",       label: "Courses" },
    { to: "/announcements", icon: "announcements", label: "Announce" },
    { to: "/handbook",      icon: "file-text",     label: "Handbook" },
    ...(isAdmin ? [{ to: "/admin", icon: "admin", label: "Admin" }] : []),
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-page)", fontFamily: "var(--font-body)" }}>
      <style>{`
        /* ── nav link resets ── */
        .lc-nav-link { text-decoration: none; }

        /* ── sidebar links ── */
        .sidebar-link {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 12px; border-radius: var(--radius-md);
          text-decoration: none; cursor: pointer;
          transition: background var(--duration-fast) var(--ease-out);
          color: var(--text-secondary);
        }
        .sidebar-link:hover  { background: var(--bg-hover); color: var(--text-primary); }
        .sidebar-link.active { background: var(--brand-light); color: var(--brand); }
        .sidebar-link span   { font-size: 14px; font-weight: 500; font-family: var(--font-body); }

        /* ── bottom nav items ── */
        .nav-item {
          display: flex; flex-direction: column; align-items: center;
          gap: 3px; padding: 6px 8px; border-radius: var(--radius-md);
          cursor: pointer; position: relative;
          transition: background var(--duration-fast) var(--ease-out);
          text-decoration: none; min-width: 44px;
        }
        .nav-item:hover            { background: var(--bg-hover); }
        .nav-item.active           { background: var(--brand-light); }
        .nav-item.active .nav-label { color: var(--brand); font-weight: 600; }
        .nav-label {
          font-size: 10px; color: var(--text-tertiary);
          font-family: var(--font-body); font-weight: 500;
          transition: color var(--duration-fast);
          white-space: nowrap;
        }

        /* ── Left sidebar: visible on desktop, hidden on mobile ── */
        .lc-sidebar {
          display: flex;
          flex-direction: column;
          width: 240px;
          flex-shrink: 0;
          padding: 20px 12px;
          position: sticky;
          top: 0;
          height: 100vh;
          overflow-y: auto;
          gap: 4px;
        }
        @media (max-width: 767px) {
          .lc-sidebar { display: none !important; }
        }

        /* ── Right panel: visible on desktop, hidden on mobile ── */
        .lc-right-panel {
          display: flex;
          flex-direction: column;
          width: 280px;
          flex-shrink: 0;
          padding: 20px 16px;
          position: sticky;
          top: 0;
          height: 100vh;
          overflow-y: auto;
        }
        @media (max-width: 1100px) {
          .lc-right-panel { display: none !important; }
        }

        /* ── Mobile header: hidden on desktop, flex on mobile ── */
        .lc-mobile-header {
          display: none;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
          padding-top: 4px;
        }
        @media (max-width: 767px) {
          .lc-mobile-header { display: flex !important; }
        }

        /* ── Bottom nav: hidden on desktop, fixed flex bar on mobile ── */
        .lc-bottom-nav {
          display: none;
        }
        @media (max-width: 767px) {
          .lc-bottom-nav {
            display: flex !important;
            flex-direction: row !important;
            justify-content: space-around !important;
            align-items: center !important;
            position: fixed !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            background: var(--nav-bg) !important;
            backdrop-filter: var(--nav-blur) !important;
            -webkit-backdrop-filter: var(--nav-blur) !important;
            border-top: 0.5px solid var(--border-sec) !important;
            padding: 6px 4px !important;
            padding-bottom: calc(8px + env(safe-area-inset-bottom, 0px)) !important;
            z-index: 100 !important;
          }
        }
      `}</style>

      <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex" }}>

        {/* ── Left Sidebar (desktop only) ── */}
        <aside className="lc-sidebar">
          {/* Logo */}
          <div style={{ marginBottom: 24, padding: "4px 0" }}>
            <LASULogo size={38} withText textSize={17} />
          </div>

          {/* Nav links */}
          {[...NAV, ...SIDEBAR_EXTRA].map(({ to, icon, label, exact, badge, onTap }) => (
            <NavLink key={to} to={to} end={exact} onClick={onTap}
              className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}>
              {({ isActive }) => (
                <>
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <LCIcon name={icon} size={20} color={isActive ? "var(--brand)" : "var(--text-secondary)"} />
                    {badge > 0 && <div className="lc-badge">{badge > 99 ? "99+" : badge}</div>}
                  </div>
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}

          <div style={{ flex: 1 }} />

          {/* Theme toggle + profile */}
          <div style={{ paddingTop: 12, borderTop: "0.5px solid var(--border)", marginTop: 8 }}>
            <div style={{ marginBottom: 10 }}>
              <ThemeToggle />
            </div>
            <NavLink to={`/profile/${user?.username}`}
              className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}>
              {({ isActive }) => (
                <>
                  <UserAvatar user={user} size={32} active={isActive} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {user?.fullName?.split(" ")[0]}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>@{user?.username}</div>
                  </div>
                </>
              )}
            </NavLink>
            <button onClick={logout} style={{
              display: "flex", alignItems: "center", gap: 10,
              width: "100%", padding: "9px 10px", marginTop: 4,
              background: "none", border: "none", borderRadius: "var(--radius-md)",
              cursor: "pointer", color: "#EF4444", fontSize: 13, fontWeight: 600,
              fontFamily: "var(--font-body)",
            }}>
              <LCIcon name="logout" size={18} color="#EF4444" />
              Sign out
            </button>
          </div>
        </aside>

        {/* ── Main content ── */}
        <main style={{
          flex: 1, minWidth: 0,
          padding: "20px 16px 96px",
        }}>
          {/* Mobile-only header */}
          <div className="lc-mobile-header">
            <LASULogo size={30} withText textSize={14} />
            <ThemeToggle compact />
          </div>

          <Outlet />
        </main>

        {/* ── Right panel (desktop only) ── */}
        <aside className="lc-right-panel">
          <div style={{ position: "relative", marginBottom: 16 }}>
            <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
              <LCIcon name="search" size={15} color="var(--text-tertiary)" />
            </div>
            <input placeholder="Search LASUConnect..." className="lc-input"
              style={{ paddingLeft: 36, fontSize: 13 }}
              onFocus={() => navigate("/search")} readOnly />
          </div>
          <ModeCard />
          <div id="right-panel-slot" />
        </aside>
      </div>

      {/* ── Bottom nav (mobile only) ── */}
      <nav className="lc-bottom-nav">
        {NAV.map(({ to, icon, label, exact, badge, onTap }) => (
          <NavLink key={to} to={to} end={exact} className="lc-nav-link" onClick={onTap}>
            {({ isActive }) => (
              <div className={`nav-item${isActive ? " active" : ""}`}>
                <div style={{ position: "relative" }}>
                  <LCIcon name={icon} size={22} color={isActive ? "var(--brand)" : "var(--text-tertiary)"} />
                  {badge > 0 && <div className="lc-badge">{badge > 9 ? "9+" : badge}</div>}
                </div>
                <span className="nav-label">{label}</span>
              </div>
            )}
          </NavLink>
        ))}

        {/* More button — opens drawer */}
        <button className="lc-nav-link" onClick={() => setShowMore(true)}
          style={{ background: "none", border: "none", cursor: "pointer" }}>
          <div className="nav-item">
            <LCIcon name="more-h" size={22} color="var(--text-tertiary)" />
            <span className="nav-label">More</span>
          </div>
        </button>
      </nav>

      {/* ── More drawer (mobile) ── */}
      {showMore && (
        <>
          {/* Backdrop */}
          <div onClick={() => setShowMore(false)} style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
            zIndex: 200, backdropFilter: "blur(2px)",
          }} />
          {/* Drawer */}
          <div style={{
            position: "fixed", bottom: 0, left: 0, right: 0,
            background: "var(--bg-surface)",
            borderRadius: "20px 20px 0 0",
            padding: "20px 16px 40px",
            zIndex: 201,
            boxShadow: "var(--shadow-3)",
            border: "0.5px solid var(--border-sec)",
            animation: "lc-fade-up 0.2s var(--ease-out)",
          }}>
            {/* Handle */}
            <div style={{ width: 36, height: 4, background: "var(--border-sec)", borderRadius: 4, margin: "0 auto 20px" }} />

            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
              More
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {SIDEBAR_EXTRA.map(({ to, icon, label }) => (
                <NavLink key={to} to={to} className="lc-nav-link"
                  onClick={() => setShowMore(false)}>
                  {({ isActive }) => (
                    <div style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "12px 14px", borderRadius: "var(--radius-md)",
                      background: isActive ? "var(--brand-light)" : "var(--bg-elevated)",
                      border: `0.5px solid ${isActive ? "var(--border-sec)" : "var(--border)"}`,
                      cursor: "pointer", textDecoration: "none",
                      transition: "background var(--duration-fast)",
                    }}>
                      <LCIcon name={icon} size={20} color={isActive ? "var(--brand)" : "var(--text-secondary)"} />
                      <span style={{
                        fontFamily: "var(--font-body)", fontWeight: 600,
                        fontSize: 13, color: isActive ? "var(--brand)" : "var(--text-primary)",
                      }}>
                        {label}
                      </span>
                    </div>
                  )}
                </NavLink>
              ))}
            </div>

            {/* Profile row */}
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "0.5px solid var(--border)" }}>
              <NavLink to={`/profile/${user?.username}`} className="lc-nav-link"
                onClick={() => setShowMore(false)}>
                {({ isActive }) => (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 14px", borderRadius: "var(--radius-md)",
                    background: isActive ? "var(--brand-light)" : "transparent",
                    cursor: "pointer",
                  }}>
                    <UserAvatar user={user} size={32} active={isActive} />
                    <div>
                      <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>
                        {user?.fullName}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                        View profile
                      </div>
                    </div>
                  </div>
                )}
              </NavLink>
            </div>
            {/* Sign out */}
            <button onClick={() => { setShowMore(false); logout(); }} style={{
              display: "flex", alignItems: "center", gap: 12,
              width: "100%", padding: "12px 14px", marginTop: 8,
              background: "#FEF2F2", border: "0.5px solid #FECACA",
              borderRadius: "var(--radius-md)", cursor: "pointer",
              color: "#EF4444", fontSize: 13, fontWeight: 600,
              fontFamily: "var(--font-body)",
            }}>
              <LCIcon name="logout" size={20} color="#EF4444" />
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default AppLayout;
