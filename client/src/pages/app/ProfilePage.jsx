import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import useAuthStore from "../../context/useAuthStore";
import {
  getProfile,
  toggleFollow,
  updateProfile,
  getFollowers,
  getFollowing,
} from "../../services/usersService";
import { getUserPosts } from "../../services/postsService";
import { getUserReels } from "../../services/reelsService";
import ImageUpload from "../../components/ImageUpload";

// ── Helpers ────────────────────────────────────────────────
const timeAgo = (date) => {
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
};

const COLORS = [
  "#1D4ED8",
  "#7C3AED",
  "#DB2777",
  "#059669",
  "#D97706",
  "#DC2626",
];
const getColor = (username) =>
  COLORS[(username?.charCodeAt(0) || 0) % COLORS.length];
const getInitials = (fullName) =>
  fullName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

// ── Avatar ─────────────────────────────────────────────────
const Avatar = ({ user, size = 40 }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: "50%",
      background: user?.avatarUrl ? "transparent" : getColor(user?.username),
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      flexShrink: 0,
      border: "3px solid white",
      boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
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
          fontWeight: 800,
          fontSize: size * 0.36,
          fontFamily: "Geist, sans-serif",
        }}
      >
        {getInitials(user?.fullName)}
      </span>
    )}
  </div>
);

// ── Cover Section ──────────────────────────────────────────
const CoverSection = ({ profile, isMe, onCoverUpdate }) => {
  if (isMe) {
    return (
      <ImageUpload
        endpoint="cover"
        shape="banner"
        currentUrl={profile?.coverUrl}
        onSuccess={(data) => onCoverUpdate(data.coverUrl)}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
            color: "#94A3B8",
          }}
        >
          <span style={{ fontSize: 28 }}>🖼️</span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            Add cover photo
          </span>
        </div>
      </ImageUpload>
    );
  }
  return (
    <div
      style={{
        width: "100%",
        height: 180,
        borderRadius: "16px 16px 0 0",
        background: profile?.coverUrl
          ? `url(${profile.coverUrl}) center/cover`
          : `linear-gradient(135deg, hsl(${(profile?.username?.charCodeAt(0) || 200) * 3}, 60%, 35%), hsl(${(profile?.username?.charCodeAt(0) || 200) * 3 + 40}, 70%, 50%))`,
      }}
    />
  );
};

// ── Avatar Section ─────────────────────────────────────────
const AvatarSection = ({ profile, isMe, onAvatarUpdate }) => {
  const initials = getInitials(profile?.fullName);
  const color = getColor(profile?.username);

  if (isMe) {
    return (
      <div style={{ position: "relative" }}>
        <ImageUpload
          endpoint="avatar"
          shape="circle"
          size={90}
          currentUrl={profile?.avatarUrl}
          onSuccess={(data) => onAvatarUpdate(data.avatarUrl)}
        >
          <div
            style={{
              width: 90,
              height: 90,
              borderRadius: "50%",
              background: color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                color: "white",
                fontWeight: 800,
                fontSize: 32,
                fontFamily: "Geist, sans-serif",
              }}
            >
              {initials}
            </span>
          </div>
        </ImageUpload>
        <div
          style={{
            position: "absolute",
            bottom: 2,
            right: 2,
            width: 26,
            height: 26,
            borderRadius: "50%",
            background: "#2563EB",
            border: "2px solid white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            pointerEvents: "none",
          }}
        >
          📷
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        width: 90,
        height: 90,
        borderRadius: "50%",
        background: profile?.avatarUrl ? "transparent" : color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        border: "3px solid white",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        flexShrink: 0,
      }}
    >
      {profile?.avatarUrl ? (
        <img
          src={profile.avatarUrl}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <span
          style={{
            color: "white",
            fontWeight: 800,
            fontSize: 32,
            fontFamily: "Geist, sans-serif",
          }}
        >
          {initials}
        </span>
      )}
    </div>
  );
};

// ── Edit Profile Modal ─────────────────────────────────────
const EditProfileModal = ({ user, onClose, onSave }) => {
  const [form, setForm] = useState({
    fullName: user.fullName || "",
    username: user.username || "",
    bio: user.bio || "",
    interests: user.interests?.join(", ") || "",
    skills: user.skills?.join(", ") || "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setError("");
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const payload = {
        fullName: form.fullName.trim(),
        username: form.username.trim(),
        bio: form.bio.trim(),
        interests: form.interests
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        skills: form.skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      };
      const res = await updateProfile(payload);
      onSave(res.data.data.user);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update profile.");
    }
    setLoading(false);
  };

  return (
    <div
      style={s.modalOverlay}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={s.modal}>
        <div style={s.modalHeader}>
          <h2 style={s.modalTitle}>Edit Profile</h2>
          <button onClick={onClose} style={s.closeBtn}>
            ✕
          </button>
        </div>
        {error && <div style={s.errorBanner}>⚠️ {error}</div>}
        <form onSubmit={handleSubmit} style={s.modalForm}>
          <FieldInput
            label="Full Name"
            name="fullName"
            value={form.fullName}
            onChange={handleChange}
          />
          <FieldInput
            label="Username"
            name="username"
            value={form.username}
            onChange={handleChange}
            prefix="@"
          />
          <div style={s.fieldGroup}>
            <label style={s.label}>
              Bio{" "}
              <span style={{ color: "#94A3B8", fontWeight: 400 }}>
                ({160 - form.bio.length} left)
              </span>
            </label>
            <textarea
              name="bio"
              value={form.bio}
              onChange={handleChange}
              placeholder="Tell campus about yourself..."
              maxLength={160}
              style={s.textarea}
            />
          </div>
          <FieldInput
            label="Interests"
            name="interests"
            value={form.interests}
            onChange={handleChange}
            hint="Comma separated e.g. coding, music, football"
          />
          <FieldInput
            label="Tutoring Skills"
            name="skills"
            value={form.skills}
            onChange={handleChange}
            hint="Courses you can help with e.g. CSC 201, MAT 101"
          />
          <div style={s.modalFooter}>
            <button type="button" onClick={onClose} style={s.cancelBtn}>
              Cancel
            </button>
            <button type="submit" disabled={loading} style={s.saveBtn}>
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
      <style>{`@keyframes modalIn { from { opacity:0; transform:scale(0.96) translateY(12px); } to { opacity:1; transform:scale(1) translateY(0); } }`}</style>
    </div>
  );
};

const FieldInput = ({ label, name, value, onChange, hint, prefix }) => (
  <div style={s.fieldGroup}>
    <label style={s.label}>{label}</label>
    <div
      style={{ position: "relative", display: "flex", alignItems: "center" }}
    >
      {prefix && <span style={s.prefix}>{prefix}</span>}
      <input
        name={name}
        value={value}
        onChange={onChange}
        style={{ ...s.input, paddingLeft: prefix ? "32px" : "12px" }}
      />
    </div>
    {hint && <span style={s.hint}>{hint}</span>}
  </div>
);

// ── Post Mini Card ─────────────────────────────────────────
const PostMiniCard = ({ post }) => (
  <div style={s.postCard}>
    <div style={s.postCardHeader}>
      <span
        style={{
          ...s.feedTypeBadge,
          background: post.feedType === "academic" ? "#EFF6FF" : "#F0FDF4",
          color: post.feedType === "academic" ? "#2563EB" : "#16A34A",
        }}
      >
        {post.feedType === "academic" ? "📚" : "🌐"}
      </span>
      <span style={s.postCardTime}>{timeAgo(post.createdAt)}</span>
    </div>
    <p style={s.postCardContent}>
      {post.content?.slice(0, 120)}
      {post.content?.length > 120 ? "..." : ""}
    </p>
    {post.mediaUrls?.[0] && (
      <img src={post.mediaUrls[0]} alt="" style={s.postCardImg} />
    )}
    <div style={s.postCardStats}>
      <span>❤️ {post.likesCount}</span>
      <span>💬 {post.commentsCount}</span>
    </div>
  </div>
);

// ── Users List Modal ───────────────────────────────────────
const UsersListModal = ({ title, users, onClose }) => {
  const navigate = useNavigate();

  const handleUserClick = (username) => {
    onClose();
    navigate(`/profile/${username}`);
  };

  return (
    <div
      style={s.modalOverlay}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ ...s.modal, maxWidth: "420px" }}>
        <div style={s.modalHeader}>
          <h2 style={s.modalTitle}>{title}</h2>
          <button onClick={onClose} style={s.closeBtn}>
            ✕
          </button>
        </div>
        <div
          style={{ maxHeight: "400px", overflowY: "auto", padding: "8px 0" }}
        >
          {users.length === 0 ? (
            <p
              style={{
                textAlign: "center",
                color: "#94A3B8",
                padding: "32px",
                fontSize: "14px",
              }}
            >
              No users yet
            </p>
          ) : (
            users.map((u) => (
              <div
                key={u._id}
                onClick={() => handleUserClick(u.username)}
                style={{ ...s.userRow, cursor: "pointer" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#F8FAFC")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: "50%",
                    background: u.avatarUrl
                      ? "transparent"
                      : getColor(u.username),
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {u.avatarUrl ? (
                    <img
                      src={u.avatarUrl}
                      alt=""
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <span
                      style={{
                        color: "white",
                        fontWeight: 700,
                        fontSize: 14,
                        fontFamily: "Geist, sans-serif",
                      }}
                    >
                      {getInitials(u.fullName)}
                    </span>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={s.userRowName}>{u.fullName}</div>
                  <div style={s.userRowMeta}>
                    @{u.username} · {u.department}
                  </div>
                </div>
                {u.isVerified && <span style={s.verifiedBadge}>✓</span>}
                <span style={{ fontSize: 14, color: "#94A3B8" }}>→</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// ── Main Profile Page ──────────────────────────────────────
const ProfilePage = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, updateUser } = useAuthStore();

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [reelsLoading, setReelsLoading] = useState(false);
  const [error, setError] = useState("");
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("posts"); // posts | academic | reels
  const [showEdit, setShowEdit] = useState(false);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [followersList, setFollowersList] = useState([]);
  const [followingList, setFollowingList] = useState([]);

  const isMe = currentUser?.username === username;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await getProfile(username);
        const u = res.data.data.user;
        setProfile(u);
        setFollowing(u.isFollowing);
      } catch (err) {
        setError(err.response?.data?.message || "User not found.");
      }
      setLoading(false);
    };
    load();
  }, [username]);

  useEffect(() => {
    if (!username) return;
    const load = async () => {
      setPostsLoading(true);
      try {
        const res = await getUserPosts(username);
        setPosts(res.data.data.posts);
      } catch (_) {}
      setPostsLoading(false);
    };
    load();
  }, [username]);

  // Load reels lazily when tab is first opened
  useEffect(() => {
    if (activeTab !== "reels" || !username || reels.length > 0) return;
    const load = async () => {
      setReelsLoading(true);
      try {
        const res = await getUserReels(username);
        setReels(res.data.data.reels);
      } catch (_) {}
      setReelsLoading(false);
    };
    load();
  }, [activeTab, username]);

  const handleFollow = async () => {
    if (followLoading) return;
    setFollowLoading(true);
    const prev = following;
    setFollowing(!prev);
    setProfile((p) => ({
      ...p,
      followersCount: prev ? p.followersCount - 1 : p.followersCount + 1,
    }));
    try {
      await toggleFollow(username);
    } catch {
      setFollowing(prev);
      setProfile((p) => ({
        ...p,
        followersCount: prev ? p.followersCount + 1 : p.followersCount - 1,
      }));
    }
    setFollowLoading(false);
  };

  const handleSaveProfile = (updatedUser) => {
    setProfile((p) => ({ ...p, ...updatedUser }));
    updateUser(updatedUser);
  };

  const loadFollowers = async () => {
    try {
      const res = await getFollowers(username);
      setFollowersList(res.data.data.followers);
    } catch (_) {}
    setShowFollowers(true);
  };

  const loadFollowing = async () => {
    try {
      const res = await getFollowing(username);
      setFollowingList(res.data.data.following);
    } catch (_) {}
    setShowFollowing(true);
  };

  // ── Loading state ──────────────────────────────────────
  if (loading)
    return (
      <div style={s.page}>
        <div
          style={{
            width: "100%",
            height: 180,
            borderRadius: "16px 16px 0 0",
            background: "#E2E8F0",
            animation: "pulse 1.5s ease infinite",
          }}
        />
        <div style={{ ...s.profileBody }}>
          <div
            style={{
              width: 90,
              height: 90,
              borderRadius: "50%",
              background: "#CBD5E1",
              marginTop: -45,
              animation: "pulse 1.5s ease infinite",
            }}
          />
          <div
            style={{
              height: 20,
              background: "#E2E8F0",
              borderRadius: 8,
              width: "30%",
              marginTop: 16,
              animation: "pulse 1.5s ease infinite",
            }}
          />
          <div
            style={{
              height: 14,
              background: "#E2E8F0",
              borderRadius: 8,
              width: "20%",
              marginTop: 10,
              animation: "pulse 1.5s ease infinite",
            }}
          />
        </div>
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
      </div>
    );

  // ── Error state ────────────────────────────────────────
  if (error)
    return (
      <div style={s.page}>
        <div style={s.errorState}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
          <h3
            style={{
              fontFamily: "Geist, sans-serif",
              fontWeight: 700,
              marginBottom: 8,
              color: "#0F172A",
            }}
          >
            User not found
          </h3>
          <p style={{ color: "#64748B", fontSize: 14, marginBottom: 20 }}>
            {error}
          </p>
          <button onClick={() => navigate(-1)} style={s.saveBtn}>
            ← Go Back
          </button>
        </div>
      </div>
    );

  return (
    <div style={s.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        textarea:focus, input:focus { outline: none; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .profile-anim { animation: fadeUp 0.3s ease forwards; }
      `}</style>

      {/* Cover */}
      <CoverSection
        profile={profile}
        isMe={isMe}
        onCoverUpdate={(url) => {
          setProfile((p) => ({ ...p, coverUrl: url }));
          updateUser({ coverUrl: url });
        }}
      />

      {/* Profile body */}
      <div style={s.profileBody} className="profile-anim">
        {/* Avatar + action buttons */}
        <div style={s.avatarRow}>
          <AvatarSection
            profile={profile}
            isMe={isMe}
            onAvatarUpdate={(url) => {
              setProfile((p) => ({ ...p, avatarUrl: url }));
              updateUser({ avatarUrl: url });
            }}
          />
          <div style={s.actionRow}>
            {isMe ? (
              <button onClick={() => setShowEdit(true)} style={s.editBtn}>
                ✏️ Edit Profile
              </button>
            ) : (
              <>
                <button
                  onClick={handleFollow}
                  disabled={followLoading}
                  style={{
                    ...s.followBtn,
                    ...(following ? s.followingBtn : {}),
                  }}
                >
                  {following ? "✓ Following" : "+ Follow"}
                </button>
                <button
                  onClick={() => navigate("/messages")}
                  style={s.messageBtn}
                >
                  💬 Message
                </button>
              </>
            )}
          </div>
        </div>

        {/* Name + meta */}
        <div style={s.nameSection}>
          <div style={s.nameRow}>
            <h1 style={s.profileName}>{profile?.fullName}</h1>
            {profile?.isVerified && <span style={s.verifiedBadge}>✓</span>}
            {profile?.role !== "student" && (
              <span style={s.roleBadge}>
                {profile?.role?.replace("_", " ")}
              </span>
            )}
          </div>
          <p style={s.profileHandle}>@{profile?.username}</p>
          {profile?.bio && <p style={s.profileBio}>{profile.bio}</p>}
          <div style={s.metaRow}>
            {[
              { icon: "🏛️", text: profile?.faculty },
              { icon: "📚", text: profile?.department },
              { icon: "🎓", text: `${profile?.level} Level` },
            ]
              .filter((m) => m.text)
              .map((m, i) => (
                <span key={i} style={s.metaItem}>
                  {m.icon} {m.text}
                </span>
              ))}
          </div>
          {profile?.interests?.length > 0 && (
            <div style={s.tagsRow}>
              {profile.interests.map((tag) => (
                <span key={tag} style={s.interestTag}>
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Stats */}
        <div style={s.statsRow}>
          {[
            { label: "Posts", value: profile?.postsCount || 0, onClick: null },
            {
              label: "Followers",
              value: profile?.followersCount || 0,
              onClick: loadFollowers,
            },
            {
              label: "Following",
              value: profile?.followingCount || 0,
              onClick: loadFollowing,
            },
          ].map(({ label, value, onClick }) => (
            <button key={label} onClick={onClick} style={s.statItem}>
              <span style={s.statNum}>{value}</span>
              <span style={s.statLabel}>{label}</span>
            </button>
          ))}
        </div>

        {/* Skills */}
        {profile?.skills?.length > 0 && (
          <div style={s.skillsCard}>
            <div style={s.skillsTitle}>🧑‍🏫 Can tutor in</div>
            <div style={s.tagsRow}>
              {profile.skills.map((skill) => (
                <span key={skill} style={s.skillTag}>
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={s.tabs}>
          {[
            { id: "posts", label: "🗂️ All Posts" },
            { id: "academic", label: "🎓 Academic" },
            { id: "reels", label: "🎬 Reels" },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              style={{ ...s.tab, ...(activeTab === id ? s.tabActive : {}) }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Posts + Academic tabs */}
        {activeTab !== "reels" &&
          (postsLoading ? (
            <div style={s.postsGrid}>
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{
                    ...s.postCard,
                    animation: "pulse 1.5s ease infinite",
                  }}
                >
                  <div
                    style={{
                      height: 14,
                      background: "#E2E8F0",
                      borderRadius: 6,
                      marginBottom: 8,
                    }}
                  />
                  <div
                    style={{
                      height: 14,
                      background: "#E2E8F0",
                      borderRadius: 6,
                      width: "70%",
                    }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <>
              {posts.filter((p) =>
                activeTab === "academic" ? p.feedType === "academic" : true,
              ).length === 0 ? (
                <div style={s.emptyPosts}>
                  <span style={{ fontSize: 36 }}>📭</span>
                  <p style={{ color: "#64748B", fontSize: 14, marginTop: 12 }}>
                    {isMe
                      ? "You haven't posted anything yet."
                      : `${profile?.fullName?.split(" ")[0]} hasn't posted yet.`}
                  </p>
                </div>
              ) : (
                <div style={s.postsGrid}>
                  {posts
                    .filter((p) =>
                      activeTab === "academic"
                        ? p.feedType === "academic"
                        : true,
                    )
                    .map((post, i) => (
                      <div
                        key={post._id}
                        style={{
                          animationDelay: `${i * 0.05}s`,
                          animation: "fadeUp 0.3s ease forwards",
                          opacity: 0,
                        }}
                      >
                        <PostMiniCard post={post} />
                      </div>
                    ))}
                </div>
              )}
            </>
          ))}

        {/* Reels tab */}
        {activeTab === "reels" &&
          (reelsLoading ? (
            <div style={s.reelsGrid}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  style={{
                    aspectRatio: "9/16",
                    borderRadius: 10,
                    background: "#E2E8F0",
                    animation: "pulse 1.5s ease infinite",
                  }}
                />
              ))}
            </div>
          ) : reels.length === 0 ? (
            <div style={s.emptyPosts}>
              <span style={{ fontSize: 36 }}>🎬</span>
              <p style={{ color: "#64748B", fontSize: 14, marginTop: 12 }}>
                {isMe
                  ? "You haven't uploaded any reels yet."
                  : `${profile?.fullName?.split(" ")[0]} hasn't uploaded any reels yet.`}
              </p>
            </div>
          ) : (
            <div style={s.reelsGrid}>
              {reels.map((reel, i) => (
                <div
                  key={reel._id}
                  style={{
                    position: "relative",
                    aspectRatio: "9/16",
                    borderRadius: 10,
                    overflow: "hidden",
                    background: "#0F172A",
                    cursor: "pointer",
                    animation: "fadeUp 0.3s ease forwards",
                    opacity: 0,
                    animationDelay: `${i * 0.05}s`,
                  }}
                >
                  {/* Thumbnail */}
                  {reel.thumbnailUrl ? (
                    <img
                      src={reel.thumbnailUrl}
                      alt=""
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 24,
                      }}
                    >
                      🎬
                    </div>
                  )}
                  {/* Overlay — views */}
                  <div
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      background:
                        "linear-gradient(to top, rgba(0,0,0,0.7), transparent)",
                      padding: "20px 8px 8px",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <span
                      style={{ fontSize: 11, color: "white", fontWeight: 700 }}
                    >
                      ▶ {reel.views || 0}
                    </span>
                    {reel.likesCount > 0 && (
                      <span
                        style={{ fontSize: 11, color: "white", marginLeft: 6 }}
                      >
                        ❤️ {reel.likesCount}
                      </span>
                    )}
                  </div>
                  {/* Play icon */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: 0.6,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 28,
                        filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))",
                      }}
                    >
                      ▶
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ))}
      </div>

      {/* Modals */}
      {showEdit && (
        <EditProfileModal
          user={profile}
          onClose={() => setShowEdit(false)}
          onSave={handleSaveProfile}
        />
      )}
      {showFollowers && (
        <UsersListModal
          title={`Followers (${profile?.followersCount})`}
          users={followersList}
          onClose={() => setShowFollowers(false)}
        />
      )}
      {showFollowing && (
        <UsersListModal
          title={`Following (${profile?.followingCount})`}
          users={followingList}
          onClose={() => setShowFollowing(false)}
        />
      )}
    </div>
  );
};

// ─── Styles ───────────────────────────────────────────────
const s = {
  page: { paddingBottom: 80, fontFamily: "'DM Sans', sans-serif" },
  profileBody: {
    background: "white",
    borderRadius: "0 0 20px 20px",
    border: "1px solid #E2E8F0",
    borderTop: "none",
    padding: "0 24px 24px",
    marginBottom: 16,
  },
  avatarRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingTop: 0,
    marginBottom: 0,
    position: "relative",
    top: -45,
  },
  actionRow: { display: "flex", gap: 8, alignItems: "center", marginTop: 50 },
  editBtn: {
    padding: "8px 18px",
    borderRadius: 10,
    border: "1.5px solid #E2E8F0",
    background: "white",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    color: "#374151",
    fontFamily: "Geist, sans-serif",
  },
  followBtn: {
    padding: "8px 22px",
    borderRadius: 10,
    border: "none",
    background: "linear-gradient(135deg, #1D4ED8, #3B82F6)",
    color: "white",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "Geist, sans-serif",
    boxShadow: "0 3px 10px rgba(37,99,235,0.3)",
    transition: "all 0.15s",
  },
  followingBtn: {
    background: "#F1F5F9",
    color: "#374151",
    boxShadow: "none",
    border: "1.5px solid #E2E8F0",
  },
  messageBtn: {
    padding: "8px 18px",
    borderRadius: 10,
    border: "1.5px solid #E2E8F0",
    background: "white",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    color: "#374151",
    fontFamily: "Geist, sans-serif",
  },
  nameSection: { marginTop: -36, marginBottom: 16 },
  nameRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 2,
  },
  profileName: {
    fontFamily: "Geist, sans-serif",
    fontWeight: 800,
    fontSize: 22,
    color: "#0F172A",
    margin: 0,
  },
  verifiedBadge: {
    background: "#2563EB",
    color: "white",
    borderRadius: "50%",
    width: 20,
    height: 20,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
    fontWeight: 700,
    flexShrink: 0,
  },
  roleBadge: {
    background: "#FEF3C7",
    color: "#D97706",
    borderRadius: 20,
    padding: "2px 10px",
    fontSize: 11,
    fontWeight: 700,
    textTransform: "capitalize",
  },
  profileHandle: { fontSize: 13, color: "#94A3B8", marginBottom: 8 },
  profileBio: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 1.6,
    marginBottom: 12,
  },
  metaRow: { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  metaItem: {
    fontSize: 12,
    color: "#475569",
    background: "#F8FAFC",
    borderRadius: 20,
    padding: "3px 10px",
    border: "1px solid #E2E8F0",
  },
  tagsRow: { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  interestTag: {
    fontSize: 12,
    color: "#7C3AED",
    background: "#F5F3FF",
    borderRadius: 20,
    padding: "3px 10px",
    fontWeight: 600,
  },
  skillTag: {
    fontSize: 12,
    color: "#059669",
    background: "#F0FDF4",
    borderRadius: 20,
    padding: "3px 10px",
    fontWeight: 600,
    border: "1px solid #BBF7D0",
  },
  statsRow: {
    display: "flex",
    gap: 4,
    borderTop: "1px solid #F1F5F9",
    borderBottom: "1px solid #F1F5F9",
    padding: "12px 0",
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "6px 0",
    borderRadius: 10,
    transition: "background 0.15s",
  },
  statNum: {
    fontFamily: "Geist, sans-serif",
    fontWeight: 800,
    fontSize: 20,
    color: "#0F172A",
    lineHeight: 1.1,
  },
  statLabel: { fontSize: 11, color: "#94A3B8", fontWeight: 600, marginTop: 2 },
  skillsCard: {
    background: "#F0FDF4",
    borderRadius: 12,
    padding: "12px 16px",
    marginBottom: 16,
    border: "1px solid #BBF7D0",
  },
  skillsTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: "#059669",
    marginBottom: 8,
  },
  tabs: {
    display: "flex",
    gap: 4,
    marginBottom: 16,
    background: "#F8FAFC",
    padding: 4,
    borderRadius: 10,
  },
  tab: {
    flex: 1,
    padding: "8px",
    border: "none",
    background: "transparent",
    fontSize: 13,
    fontWeight: 600,
    color: "#64748B",
    cursor: "pointer",
    borderRadius: 8,
    transition: "all 0.15s",
    fontFamily: "'DM Sans', sans-serif",
  },
  tabActive: {
    background: "white",
    color: "#0F172A",
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
  },
  postsGrid: { display: "flex", flexDirection: "column", gap: 10 },
  reelsGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4 },
  postCard: {
    background: "#F8FAFC",
    borderRadius: 12,
    padding: "14px 16px",
    border: "1px solid #E2E8F0",
    cursor: "pointer",
  },
  postCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  feedTypeBadge: {
    fontSize: 11,
    padding: "2px 8px",
    borderRadius: 20,
    fontWeight: 600,
  },
  postCardTime: { fontSize: 11, color: "#94A3B8" },
  postCardContent: {
    fontSize: 13.5,
    color: "#1E293B",
    lineHeight: 1.6,
    marginBottom: 8,
  },
  postCardImg: {
    width: "100%",
    maxHeight: 200,
    objectFit: "cover",
    borderRadius: 8,
    marginBottom: 8,
  },
  postCardStats: {
    display: "flex",
    gap: 12,
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: 600,
  },
  emptyPosts: { textAlign: "center", padding: "40px 20px", color: "#94A3B8" },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: 16,
  },
  modal: {
    background: "white",
    borderRadius: 20,
    width: "100%",
    maxWidth: 520,
    maxHeight: "90vh",
    overflowY: "auto",
    animation: "modalIn 0.25s ease forwards",
    boxShadow: "0 24px 80px rgba(0,0,0,0.25)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 24px",
    borderBottom: "1px solid #F1F5F9",
  },
  modalTitle: {
    fontFamily: "Geist, sans-serif",
    fontWeight: 700,
    fontSize: 18,
    color: "#0F172A",
    margin: 0,
  },
  closeBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: 18,
    color: "#94A3B8",
    padding: 4,
    borderRadius: 6,
  },
  modalForm: {
    padding: "20px 24px",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  modalFooter: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    paddingTop: 8,
  },
  fieldGroup: { display: "flex", flexDirection: "column", gap: 5 },
  label: { fontSize: 13, fontWeight: 600, color: "#374151" },
  hint: { fontSize: 11, color: "#94A3B8" },
  prefix: {
    position: "absolute",
    left: 12,
    color: "#94A3B8",
    fontSize: 14,
    zIndex: 1,
    pointerEvents: "none",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    border: "1.5px solid #E2E8F0",
    borderRadius: 10,
    fontSize: 14,
    color: "#0F172A",
    background: "#F8FAFC",
    fontFamily: "'DM Sans', sans-serif",
  },
  textarea: {
    width: "100%",
    padding: "10px 12px",
    border: "1.5px solid #E2E8F0",
    borderRadius: 10,
    fontSize: 14,
    color: "#0F172A",
    background: "#F8FAFC",
    fontFamily: "'DM Sans', sans-serif",
    resize: "none",
    height: 90,
    lineHeight: 1.5,
  },
  cancelBtn: {
    padding: "9px 20px",
    border: "1.5px solid #E2E8F0",
    borderRadius: 10,
    background: "white",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    color: "#374151",
    fontFamily: "Geist, sans-serif",
  },
  saveBtn: {
    padding: "9px 24px",
    border: "none",
    borderRadius: 10,
    background: "linear-gradient(135deg, #1D4ED8, #3B82F6)",
    color: "white",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "Geist, sans-serif",
    boxShadow: "0 3px 10px rgba(37,99,235,0.3)",
  },
  errorBanner: {
    margin: "0 24px 0",
    background: "#FEF2F2",
    border: "1px solid #FECACA",
    borderRadius: 10,
    padding: "10px 14px",
    fontSize: 13,
    color: "#DC2626",
  },
  errorState: { textAlign: "center", padding: "80px 20px" },
  userRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 24px",
    transition: "background 0.15s",
  },
  userRowName: {
    fontFamily: "Geist, sans-serif",
    fontWeight: 700,
    fontSize: 14,
    color: "#0F172A",
  },
  userRowMeta: { fontSize: 12, color: "#94A3B8" },
};

export default ProfilePage;
