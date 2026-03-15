import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../../context/SocketContext";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAll,
} from "../../services/notificationsService";
import { toggleFollow } from "../../services/usersService";

// ── Time helpers ───────────────────────────────────────────
const timeAgo = (date) => {
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return new Date(date).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
  });
};

const isToday = (date) => {
  const d = new Date(date);
  const now = new Date();
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  );
};

const isThisWeek = (date) => {
  const d = new Date(date);
  const now = new Date();
  const diff = (now - d) / 1000;
  return diff < 7 * 24 * 3600 && !isToday(date);
};

// ── Type config ────────────────────────────────────────────
const TYPE_CONFIG = {
  like: { icon: "❤️", color: "#EF4444", verb: "liked your post" },
  comment: { icon: "💬", color: "#2563EB", verb: "commented on your post" },
  follow: { icon: "👤", color: "#7C3AED", verb: "started following you" },
  mention: { icon: "📣", color: "#D97706", verb: "mentioned you" },
  message: { icon: "✉️", color: "#059669", verb: "sent you a message" },
  reel_like: { icon: "🎬", color: "#EF4444", verb: "liked your reel" },
  reel_comment: {
    icon: "🎬",
    color: "#2563EB",
    verb: "commented on your reel",
  },
  announcement: { icon: "📢", color: "#D97706", verb: "New announcement" },
  live_start: { icon: "🔴", color: "#EF4444", verb: "went live" },
  tutoring_request: {
    icon: "🧑‍🏫",
    color: "#059669",
    verb: "requested tutoring",
  },
};

// ── Group notifications by type + targetId ─────────────────
// e.g. 5 likes on same post → one grouped entry
const groupNotifications = (notifications) => {
  const groups = new Map();

  notifications.forEach((notif) => {
    // Only group likes — comments stay individual (each is unique content)
    const shouldGroup = notif.type === "like" || notif.type === "reel_like";
    const key = shouldGroup ? `${notif.type}_${notif.targetId}` : notif._id;

    if (!groups.has(key)) {
      groups.set(key, { ...notif, actors: [notif.actor], _groupKey: key });
    } else {
      const existing = groups.get(key);
      if (
        notif.actor &&
        !existing.actors.find((a) => a?._id === notif.actor?._id)
      ) {
        existing.actors.push(notif.actor);
      }
      // Keep the most recent timestamp
      if (new Date(notif.createdAt) > new Date(existing.createdAt)) {
        existing.createdAt = notif.createdAt;
      }
      // If any in group is unread, group is unread
      if (!notif.isRead) existing.isRead = false;
    }
  });

  return Array.from(groups.values());
};

// ── Build grouped message ──────────────────────────────────
const getGroupedMessage = (notif) => {
  const actors = notif.actors || [notif.actor];
  const config = TYPE_CONFIG[notif.type];
  if (!config) return notif.message;

  if (actors.length === 1) {
    return `${actors[0]?.fullName || "Someone"} ${config.verb}`;
  }
  if (actors.length === 2) {
    return `${actors[0]?.fullName} and ${actors[1]?.fullName} ${config.verb}`;
  }
  return `${actors[0]?.fullName} and ${actors.length - 1} others ${config.verb}`;
};

// ── Avatar stack (for grouped) ─────────────────────────────
const AvatarStack = ({ actors = [], typeIcon, size = 44 }) => {
  const colors = [
    "#1D4ED8",
    "#7C3AED",
    "#DB2777",
    "#059669",
    "#D97706",
    "#DC2626",
  ];
  const getColor = (u) =>
    colors[(u?.username?.charCodeAt(0) || 0) % colors.length];
  const getInitials = (u) =>
    u?.fullName
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";
  const shown = actors.slice(0, 2);

  return (
    <div
      style={{
        position: "relative",
        width: size + (shown.length > 1 ? 16 : 0),
        height: size,
        flexShrink: 0,
      }}
    >
      {shown.map((actor, i) => (
        <div
          key={actor?._id || i}
          style={{
            position: "absolute",
            left: i * 16,
            width: shown.length > 1 ? size - 6 : size,
            height: shown.length > 1 ? size - 6 : size,
            borderRadius: "50%",
            background: actor?.avatarUrl ? "transparent" : getColor(actor),
            border: "2px solid white",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: shown.length - i,
            boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
          }}
        >
          {actor?.avatarUrl ? (
            <img
              src={actor.avatarUrl}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <span
              style={{
                color: "white",
                fontWeight: 700,
                fontSize: (size - 6) * 0.32,
                fontFamily: "Geist, sans-serif",
              }}
            >
              {getInitials(actor)}
            </span>
          )}
        </div>
      ))}
      {/* Type icon badge */}
      {typeIcon && (
        <div
          style={{
            position: "absolute",
            bottom: -2,
            right: -2,
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
            zIndex: 10,
          }}
        >
          {typeIcon}
        </div>
      )}
    </div>
  );
};

// ── Thumbnail preview ──────────────────────────────────────
const ThumbnailPreview = ({ notif }) => {
  const hasThumb =
    notif.type === "like" ||
    notif.type === "comment" ||
    notif.type === "reel_like" ||
    notif.type === "reel_comment";
  if (!hasThumb) return null;

  const isReel = notif.type === "reel_like" || notif.type === "reel_comment";

  return (
    <div
      style={{
        width: 44,
        height: 44,
        borderRadius: 8,
        overflow: "hidden",
        background: "#E2E8F0",
        flexShrink: 0,
        position: "relative",
      }}
    >
      {notif.targetThumbnail ? (
        <img
          src={notif.targetThumbnail}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: isReel ? "#0F172A" : "#F1F5F9",
            fontSize: 18,
          }}
        >
          {isReel ? "🎬" : "📝"}
        </div>
      )}
    </div>
  );
};

// ── Follow Back Button ─────────────────────────────────────
const FollowBackBtn = ({ actor }) => {
  const [status, setStatus] = useState("idle"); // idle | following | done
  const [loading, setLoading] = useState(false);

  const handle = async (e) => {
    e.stopPropagation();
    if (loading || status === "done") return;
    setLoading(true);
    try {
      await toggleFollow(actor?.username);
      setStatus((prev) => (prev === "done" ? "idle" : "done"));
    } catch (_) {}
    setLoading(false);
  };

  return (
    <button
      onClick={handle}
      disabled={loading}
      style={{
        padding: "6px 14px",
        borderRadius: 8,
        border: "none",
        background:
          status === "done"
            ? "#F1F5F9"
            : "linear-gradient(135deg, #1D4ED8, #3B82F6)",
        color: status === "done" ? "#374151" : "white",
        fontSize: 12,
        fontWeight: 700,
        cursor: "pointer",
        fontFamily: "Geist, sans-serif",
        whiteSpace: "nowrap",
        transition: "all 0.2s",
        flexShrink: 0,
        boxShadow: status === "done" ? "none" : "0 2px 8px rgba(37,99,235,0.3)",
        border: status === "done" ? "1.5px solid #E2E8F0" : "none",
      }}
    >
      {loading ? "..." : status === "done" ? "✓ Following" : "Follow back"}
    </button>
  );
};

// ── Single notification row ────────────────────────────────
const NotificationRow = ({ notif, onRead, onDelete, onNavigate }) => {
  const config = TYPE_CONFIG[notif.type] || { icon: "🔔", color: "#64748B" };
  const message = getGroupedMessage(notif);
  const isFollow = notif.type === "follow";
  const actors = notif.actors || [notif.actor];

  const handleClick = () => {
    if (!notif.isRead) onRead(notif);
    onNavigate(notif);
  };

  return (
    <div
      onClick={handleClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 16px",
        borderRadius: 14,
        cursor: "pointer",
        background: notif.isRead ? "white" : "#F0F7FF",
        borderLeft: notif.isRead
          ? "3px solid transparent"
          : `3px solid ${config.color}`,
        border: "1px solid #F1F5F9",
        borderLeft: notif.isRead
          ? "3px solid transparent"
          : `3px solid ${config.color}`,
        transition: "background 0.15s",
        position: "relative",
        marginBottom: 2,
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = notif.isRead
          ? "#F8FAFC"
          : "#E8F1FF")
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.background = notif.isRead ? "white" : "#F0F7FF")
      }
    >
      {/* Avatar stack */}
      <AvatarStack actors={actors} typeIcon={config.icon} size={46} />

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13.5,
            color: "#1E293B",
            lineHeight: 1.5,
            marginBottom: 2,
          }}
        >
          <span style={{ fontFamily: "Geist, sans-serif", fontWeight: 700 }}>
            {actors[0]?.fullName || "Someone"}
          </span>
          {actors.length > 1 && (
            <span style={{ color: "#374151" }}>
              {" "}
              and {actors.length - 1} other{actors.length > 2 ? "s" : ""}
            </span>
          )}{" "}
          <span style={{ color: "#374151" }}>{config.verb}</span>
        </div>
        <div style={{ fontSize: 11.5, color: "#94A3B8", fontWeight: 500 }}>
          {timeAgo(notif.createdAt)}
        </div>
      </div>

      {/* Right side: follow back OR thumbnail */}
      {isFollow && actors[0] ? (
        <FollowBackBtn actor={actors[0]} />
      ) : (
        <ThumbnailPreview notif={notif} />
      )}

      {/* Unread dot */}
      {!notif.isRead && (
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#2563EB",
            flexShrink: 0,
            marginLeft: 4,
          }}
        />
      )}

      {/* Delete button — visible on hover via parent */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(notif);
        }}
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          background: "#F1F5F9",
          border: "none",
          borderRadius: "50%",
          width: 20,
          height: 20,
          cursor: "pointer",
          fontSize: 10,
          color: "#94A3B8",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: 0,
          transition: "opacity 0.15s",
        }}
        onMouseEnter={(e) => {
          e.stopPropagation();
          e.currentTarget.style.opacity = 1;
        }}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = 0)}
        ref={(el) => {
          if (el) {
            el.closest("[data-notif]")?.addEventListener(
              "mouseenter",
              () => (el.style.opacity = 1),
            );
            el.closest("[data-notif]")?.addEventListener(
              "mouseleave",
              () => (el.style.opacity = 0),
            );
          }
        }}
      >
        ✕
      </button>
    </div>
  );
};

// ── Section header ─────────────────────────────────────────
const SectionHeader = ({ title }) => (
  <div
    style={{
      padding: "16px 4px 8px",
      fontFamily: "Geist, sans-serif",
      fontWeight: 800,
      fontSize: 15,
      color: "#0F172A",
    }}
  >
    {title}
  </div>
);

// ── Main Page ──────────────────────────────────────────────
const NotificationsPage = () => {
  const navigate = useNavigate();
  const socket = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");

  const load = useCallback(async (pageNum = 1, reset = false) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);
    try {
      const res = await getNotifications(pageNum);
      const { notifications: n } = res.data.data;
      const { meta } = res.data;
      setNotifications((p) => (reset || pageNum === 1 ? n : [...p, ...n]));
      setUnreadCount(meta.unreadCount);
      setHasMore(meta.hasMore);
      setPage(pageNum);
    } catch (_) {}
    setLoading(false);
    setLoadingMore(false);
  }, []);

  useEffect(() => {
    load(1, true);
  }, []);

  // Real-time
  useEffect(() => {
    if (!socket) return;
    const handler = (n) => {
      setNotifications((p) => [n, ...p]);
      setUnreadCount((c) => c + 1);
    };
    socket.on("notification:new", handler);
    return () => socket.off("notification:new", handler);
  }, [socket]);

  const handleRead = (notif) => {
    setNotifications((p) =>
      p.map((n) => (n._id === notif._id ? { ...n, isRead: true } : n)),
    );
    if (!notif.isRead) setUnreadCount((c) => Math.max(0, c - 1));
    markAsRead(notif._id).catch(() => {});
  };

  const handleMarkAllRead = async () => {
    setNotifications((p) => p.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    await markAllAsRead().catch(() => {});
  };

  const handleDelete = (notif) => {
    setNotifications((p) => p.filter((n) => n._id !== notif._id));
    if (!notif.isRead) setUnreadCount((c) => Math.max(0, c - 1));
    deleteNotification(notif._id).catch(() => {});
  };

  const handleClearAll = async () => {
    setNotifications([]);
    setUnreadCount(0);
    await clearAll().catch(() => {});
  };

  const handleNavigate = (notif) => {
    switch (notif.type) {
      case "follow":
        navigate(
          `/profile/${notif.actors?.[0]?.username || notif.actor?.username}`,
        );
        break;
      case "like":
      case "comment":
        navigate("/");
        break;
      case "reel_like":
      case "reel_comment":
        navigate("/reels");
        break;
      case "message":
        navigate("/messages");
        break;
      default:
        break;
    }
  };

  const FILTERS = [
    { id: "all", label: "All" },
    { id: "like", label: "❤️ Likes" },
    { id: "comment", label: "💬 Comments" },
    { id: "follow", label: "👤 Follows" },
    { id: "message", label: "✉️ Messages" },
  ];

  // Filter then group
  const grouped = groupNotifications(notifications);

  // Split into time sections
  const todayItems = grouped.filter((n) => isToday(n.createdAt));
  const weekItems = grouped.filter((n) => isThisWeek(n.createdAt));
  const earlierItems = grouped.filter(
    (n) => !isToday(n.createdAt) && !isThisWeek(n.createdAt),
  );

  const renderSection = (title, items) => {
    if (items.length === 0) return null;
    return (
      <div key={title}>
        <SectionHeader title={title} />
        {items.map((notif) => (
          <NotificationRow
            key={notif._groupKey || notif._id}
            notif={notif}
            onRead={handleRead}
            onDelete={handleDelete}
            onNavigate={handleNavigate}
          />
        ))}
      </div>
    );
  };

  return (
    <div style={{ paddingBottom: 80, fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        @keyframes slideIn { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 16,
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "Geist, sans-serif",
              fontWeight: 800,
              fontSize: 26,
              color: "#0F172A",
              margin: 0,
            }}
          >
            Notifications
          </h1>
          {unreadCount > 0 && (
            <span
              style={{
                display: "inline-block",
                background: "linear-gradient(135deg, #1D4ED8, #3B82F6)",
                color: "white",
                borderRadius: 20,
                padding: "2px 10px",
                fontSize: 11,
                fontWeight: 700,
                marginTop: 4,
              }}
            >
              {unreadCount} new
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              style={{
                padding: "7px 12px",
                borderRadius: 8,
                border: "none",
                background: "#EFF6FF",
                color: "#2563EB",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
                whiteSpace: "nowrap",
              }}
            >
              ✓ Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={handleClearAll}
              style={{
                padding: "7px 12px",
                borderRadius: 8,
                border: "none",
                background: "#FEF2F2",
                color: "#EF4444",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              🗑️
            </button>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 16px",
                borderRadius: 14,
                background: "white",
                border: "1px solid #F1F5F9",
                marginBottom: 2,
              }}
            >
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: "50%",
                  background: "#E2E8F0",
                  flexShrink: 0,
                  animation: "pulse 1.5s ease infinite",
                }}
              />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    height: 13,
                    background: "#E2E8F0",
                    borderRadius: 6,
                    width: "55%",
                    marginBottom: 8,
                    animation: "pulse 1.5s ease infinite",
                  }}
                />
                <div
                  style={{
                    height: 11,
                    background: "#E2E8F0",
                    borderRadius: 6,
                    width: "20%",
                    animation: "pulse 1.5s ease infinite",
                  }}
                />
              </div>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 8,
                  background: "#E2E8F0",
                  animation: "pulse 1.5s ease infinite",
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Grouped + sectioned list */}
      {!loading &&
        (grouped.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 20px" }}>
            <span style={{ fontSize: 52, display: "block", marginBottom: 16 }}>
              🔔
            </span>
            <h3
              style={{
                fontFamily: "Geist, sans-serif",
                fontWeight: 700,
                fontSize: 20,
                color: "#0F172A",
                marginBottom: 8,
              }}
            >
              {activeFilter === "You're all caught up!"}
            </h3>
            <p
              style={{
                fontSize: 14,
                color: "#64748B",
                lineHeight: 1.6,
                maxWidth: 280,
                margin: "0 auto",
              }}
            >
              {activeFilter ===
                "When someone likes, comments, or follows you, it will appear here."}
            </p>
          </div>
        ) : (
          <div>
            {renderSection("Today", todayItems)}
            {renderSection("This Week", weekItems)}
            {renderSection("Earlier", earlierItems)}

            {hasMore && (
              <button
                onClick={() => load(page + 1)}
                disabled={loadingMore}
                style={{
                  width: "100%",
                  padding: 12,
                  border: "1.5px solid #E2E8F0",
                  borderRadius: 12,
                  background: "white",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#374151",
                  cursor: "pointer",
                  marginTop: 12,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {loadingMore ? (
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      justifyContent: "center",
                    }}
                  >
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        border: "2px solid #E2E8F0",
                        borderTopColor: "#2563EB",
                        borderRadius: "50%",
                        animation: "spin 0.7s linear infinite",
                      }}
                    />
                    Loading...
                  </span>
                ) : (
                  "Load more"
                )}
              </button>
            )}

            {!hasMore && grouped.length > 5 && (
              <div
                style={{
                  textAlign: "center",
                  fontSize: 13,
                  color: "#94A3B8",
                  padding: "20px",
                  fontWeight: 600,
                }}
              >
                You've seen all notifications 🎉
              </div>
            )}
          </div>
        ))}
    </div>
  );
};

export default NotificationsPage;
