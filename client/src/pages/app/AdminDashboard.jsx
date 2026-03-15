import { useState, useEffect, useRef } from 'react';
import useIsMobile from '../../hooks/useIsMobile';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../context/useAuthStore';
import {
  getStats, getUsers, updateUserRole, verifyUser,
  toggleSuspend, getPosts, adminDeletePost,
} from '../../services/adminService';

// ── Helpers ────────────────────────────────────────────────
const timeAgo = (date) => {
  if (!date) return 'Never';
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
};

const ROLES = ['student', 'course_rep', 'lecturer', 'admin', 'super_admin'];

const ROLE_COLORS = {
  student:     { color: '#64748B', bg: '#F1F5F9' },
  course_rep:  { color: '#2563EB', bg: '#EFF6FF' },
  lecturer:    { color: '#7C3AED', bg: '#F5F3FF' },
  admin:       { color: '#D97706', bg: '#FFFBEB' },
  super_admin: { color: '#DC2626', bg: '#FEF2F2' },
};

// ── Avatar ─────────────────────────────────────────────────
const Avatar = ({ user, size = 36 }) => {
  const initials = user?.fullName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  const colors = ['#1D4ED8','#7C3AED','#DB2777','#059669','#D97706','#DC2626'];
  const color = colors[(user?.username?.charCodeAt(0) || 0) % colors.length];
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: user?.avatarUrl ? 'transparent' : color, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
      {user?.avatarUrl
        ? <img src={user.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span style={{ color: 'white', fontWeight: 700, fontSize: size * 0.35, fontFamily: 'Geist, sans-serif' }}>{initials}</span>
      }
    </div>
  );
};

// ── Stat Card ──────────────────────────────────────────────
const StatCard = ({ icon, label, value, sub, color = '#2563EB' }) => (
  <div style={s.statCard}>
    <div style={{ ...s.statIcon, background: color + '18', color }}>
      {icon}
    </div>
    <div style={s.statNum}>{value?.toLocaleString() ?? '—'}</div>
    <div style={s.statLabel}>{label}</div>
    {sub && <div style={s.statSub}>{sub}</div>}
  </div>
);

// ── Role Badge ─────────────────────────────────────────────
const RoleBadge = ({ role }) => {
  const cfg = ROLE_COLORS[role] || ROLE_COLORS.student;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 20, padding: '2px 10px', background: cfg.bg, color: cfg.color, textTransform: 'capitalize', fontFamily: 'Geist, sans-serif' }}>
      {role?.replace('_', ' ')}
    </span>
  );
};

// ── User Row ───────────────────────────────────────────────
const UserRow = ({ user, currentUser, onRoleChange, onVerify, onSuspend }) => {
  const [roleLoading, setRoleLoading]       = useState(false);
  const [actionLoading, setActionLoading]   = useState(false);
  const [selectedRole, setSelectedRole]     = useState(user.role);
  const navigate = useNavigate();

  const handleRoleChange = async (newRole) => {
    if (newRole === user.role) return;
    setRoleLoading(true);
    setSelectedRole(newRole);
    try { await onRoleChange(user._id, newRole); }
    catch { setSelectedRole(user.role); }
    setRoleLoading(false);
  };

  const handleSuspend = async () => {
    setActionLoading(true);
    await onSuspend(user._id);
    setActionLoading(false);
  };

  const handleVerify = async () => {
    setActionLoading(true);
    await onVerify(user._id);
    setActionLoading(false);
  };

  const isSelf = user._id === currentUser?._id;
  const canAssignAdmin = ['admin', 'super_admin'].includes(currentUser?.role);
  const availableRoles = currentUser?.role === 'super_admin' ? ROLES : ROLES.filter(r => !['admin', 'super_admin'].includes(r));

  return (
    <div style={s.userRow}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
        <Avatar user={user} size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={s.userName}>{user.fullName}</span>
            {user.isVerified && <span style={s.verifiedBadge}>✓</span>}
            {!user.isActive && <span style={s.suspendedBadge}>Suspended</span>}
          </div>
          <div style={s.userMeta}>
            @{user.username} · {user.department || 'No dept'} · Joined {timeAgo(user.createdAt)}
          </div>
        </div>
      </div>

      {/* Role selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <select
          value={selectedRole}
          onChange={e => handleRoleChange(e.target.value)}
          disabled={roleLoading || isSelf}
          style={{
            ...s.roleSelect,
            ...(ROLE_COLORS[selectedRole] ? { color: ROLE_COLORS[selectedRole].color, background: ROLE_COLORS[selectedRole].bg } : {}),
            opacity: isSelf ? 0.5 : 1,
          }}
        >
          {availableRoles.map(r => (
            <option key={r} value={r}>{r.replace('_', ' ')}</option>
          ))}
        </select>

        {/* Verify button */}
        {!user.isVerified && (
          <button onClick={handleVerify} disabled={actionLoading}
            style={s.verifyBtn} title="Verify user">
            ✓
          </button>
        )}

        {/* Suspend button */}
        {!isSelf && (
          <button onClick={handleSuspend} disabled={actionLoading}
            style={{ ...s.suspendBtn, background: user.isActive ? '#FEF2F2' : '#F0FDF4', color: user.isActive ? '#EF4444' : '#16A34A' }}
            title={user.isActive ? 'Suspend user' : 'Unsuspend user'}>
            {user.isActive ? '🚫' : '✓'}
          </button>
        )}

        {/* View profile */}
        <button onClick={() => navigate(`/profile/${user.username}`)}
          style={s.viewBtn} title="View profile">
          👤
        </button>
      </div>
    </div>
  );
};

// ── Post Row ───────────────────────────────────────────────
const PostRow = ({ post, onDelete }) => {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm('Remove this post? This cannot be undone.')) return;
    setDeleting(true);
    await onDelete(post._id);
  };

  return (
    <div style={{ ...s.userRow, alignItems: 'flex-start' }}>
      <Avatar user={post.author} size={36} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={s.userName}>{post.author?.fullName}</span>
          <RoleBadge role={post.author?.role} />
          <span style={s.userMeta}>{timeAgo(post.createdAt)}</span>
        </div>
        <p style={{ fontSize: 13.5, color: '#374151', lineHeight: 1.5, marginBottom: 6 }}>
          {post.content?.slice(0, 180)}{post.content?.length > 180 ? '...' : ''}
        </p>
        <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#94A3B8' }}>
          <span>❤️ {post.likesCount}</span>
          <span>💬 {post.commentsCount}</span>
          <span style={{ background: post.feedType === 'academic' ? '#EFF6FF' : '#F0FDF4', color: post.feedType === 'academic' ? '#2563EB' : '#16A34A', borderRadius: 20, padding: '1px 8px', fontWeight: 600 }}>
            {post.feedType}
          </span>
        </div>
      </div>
      <button onClick={handleDelete} disabled={deleting}
        style={{ ...s.suspendBtn, background: '#FEF2F2', color: '#EF4444', flexShrink: 0 }}>
        {deleting ? '...' : '🗑️'}
      </button>
    </div>
  );
};

// ── Main Admin Dashboard ───────────────────────────────────
const AdminDashboard = () => {
  const isMobile = useIsMobile();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [activeTab, setActiveTab]     = useState('overview');
  const [stats, setStats]             = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Users
  const [users, setUsers]             = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersMeta, setUsersMeta]     = useState({});
  const [userSearch, setUserSearch]   = useState('');
  const [roleFilter, setRoleFilter]   = useState('');
  const [userPage, setUserPage]       = useState(1);

  // Posts
  const [posts, setPosts]             = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsMeta, setPostsMeta]     = useState({});
  const [postSearch, setPostSearch]   = useState('');
  const [postPage, setPostPage]       = useState(1);

  const searchDebounce = useRef(null);

  // Guard — redirect if not admin
  useEffect(() => {
    if (!['admin', 'super_admin'].includes(user?.role)) {
      navigate('/');
    }
  }, [user]);

  // Load stats
  useEffect(() => {
    getStats()
      .then(res => setStats(res.data.data))
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, []);

  // Load users
  const loadUsers = async (page = 1, reset = false) => {
    setUsersLoading(true);
    try {
      const res = await getUsers({ page, limit: 20, search: userSearch, role: roleFilter });
      setUsers(p => reset ? res.data.data.users : [...p, ...res.data.data.users]);
      setUsersMeta(res.data.meta);
      setUserPage(page);
    } catch (_) {}
    setUsersLoading(false);
  };

  // Load posts
  const loadPosts = async (page = 1, reset = false) => {
    setPostsLoading(true);
    try {
      const res = await getPosts({ page, limit: 20, search: postSearch });
      setPosts(p => reset ? res.data.data.posts : [...p, ...res.data.data.posts]);
      setPostsMeta(res.data.meta);
      setPostPage(page);
    } catch (_) {}
    setPostsLoading(false);
  };

  useEffect(() => {
    if (activeTab === 'users') {
      clearTimeout(searchDebounce.current);
      searchDebounce.current = setTimeout(() => loadUsers(1, true), 350);
    }
    if (activeTab === 'posts') {
      clearTimeout(searchDebounce.current);
      searchDebounce.current = setTimeout(() => loadPosts(1, true), 350);
    }
    return () => clearTimeout(searchDebounce.current);
  }, [activeTab, userSearch, roleFilter, postSearch]);

  const handleRoleChange = async (id, role) => {
    try {
      await updateUserRole(id, role);
      setUsers(p => p.map(u => u._id === id ? { ...u, role } : u));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update role.');
      throw err;
    }
  };

  const handleVerify = async (id) => {
    try {
      await verifyUser(id);
      setUsers(p => p.map(u => u._id === id ? { ...u, isVerified: true } : u));
    } catch (_) {}
  };

  const handleSuspend = async (id) => {
    try {
      await toggleSuspend(id);
      setUsers(p => p.map(u => u._id === id ? { ...u, isActive: !u.isActive } : u));
    } catch (_) {}
  };

  const handleDeletePost = async (id) => {
    try {
      await adminDeletePost(id);
      setPosts(p => p.filter(post => post._id !== id));
    } catch (_) {}
  };

  const TABS = [
    { id: 'overview',  label: '📊 Overview' },
    { id: 'users',     label: `👥 Users${stats ? ` (${stats.users.total})` : ''}` },
    { id: 'posts',     label: `📝 Posts${stats ? ` (${stats.posts.total})` : ''}` },
  ];

  return (
    <div style={s.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        input:focus, select:focus { outline: none; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={s.pageTitle}>Admin Dashboard</h1>
          <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>
            Logged in as <strong>{user?.fullName}</strong> ·
            <span style={{ ...ROLE_COLORS[user?.role], borderRadius: 20, padding: '1px 10px', marginLeft: 6, fontSize: 11, fontWeight: 700 }}>
              {user?.role?.replace('_', ' ')}
            </span>
          </div>
        </div>
        <button onClick={() => navigate('/')} style={s.backBtn}>← Back to App</button>
      </div>

      {/* Tabs */}
      <div style={s.tabs}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{ ...s.tab, ...(activeTab === t.id ? s.tabActive : {}) }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === 'overview' && (
        <div style={{ animation: 'fadeUp 0.3s ease forwards' }}>
          {statsLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
              <div style={s.spinner} />
            </div>
          ) : stats && (
            <>
              {/* Main stat cards */}
              <div style={{ ...s.statsGrid, gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)' }}>
                <StatCard icon="👥" label="Total Users"    value={stats.users.total}    sub={`+${stats.users.today} today`}  color="#2563EB" />
                <StatCard icon="📝" label="Total Posts"    value={stats.posts.total}    sub={`+${stats.posts.today} today`}  color="#7C3AED" />
                <StatCard icon="🎬" label="Total Reels"    value={stats.reels.total}    sub={`+${stats.reels.week} this week`} color="#DB2777" />
                <StatCard icon="📚" label="Course Hubs"    value={stats.courses.total}  color="#059669" />
                <StatCard icon="📢" label="Announcements"  value={stats.announcements.total} color="#D97706" />
                <StatCard icon="💬" label="Conversations"  value={stats.conversations.total} color="#0891B2" />
              </div>

              {/* Weekly activity */}
              <div style={s.sectionTitle}>📈 This Week</div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
                {[
                  { label: 'New Users',  value: stats.users.week,  color: '#2563EB' },
                  { label: 'New Posts',  value: stats.posts.week,  color: '#7C3AED' },
                  { label: 'New Reels',  value: stats.reels.week,  color: '#DB2777' },
                ].map(item => (
                  <div key={item.label} style={{ background: 'white', borderRadius: 12, padding: '14px 16px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'Geist, sans-serif', fontWeight: 800, fontSize: 24, color: item.color }}>{item.value}</div>
                    <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{item.label}</div>
                  </div>
                ))}
              </div>

              {/* Role breakdown */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, marginBottom: 24 }}>
                <div style={s.breakdownCard}>
                  <div style={s.sectionTitle}>👤 Role Breakdown</div>
                  {ROLES.map(role => {
                    const count = stats.roleBreakdown[role] || 0;
                    const pct = stats.users.total > 0 ? Math.round((count / stats.users.total) * 100) : 0;
                    const cfg = ROLE_COLORS[role];
                    return (
                      <div key={role} style={{ marginBottom: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#374151', textTransform: 'capitalize' }}>
                            {role.replace('_', ' ')}
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: cfg.color }}>{count}</span>
                        </div>
                        <div style={{ height: 6, background: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: cfg.color, borderRadius: 4, transition: 'width 0.5s ease' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Level breakdown */}
                <div style={s.breakdownCard}>
                  <div style={s.sectionTitle}>🎓 Level Breakdown</div>
                  {stats.levelBreakdown.map(item => {
                    const pct = stats.users.total > 0 ? Math.round((item.count / stats.users.total) * 100) : 0;
                    return (
                      <div key={item._id} style={{ marginBottom: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{item._id} Level</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#2563EB' }}>{item.count}</span>
                        </div>
                        <div style={{ height: 6, background: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: '#2563EB', borderRadius: 4 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recent signups */}
              <div style={s.breakdownCard}>
                <div style={s.sectionTitle}>🆕 Recent Signups</div>
                {stats.recentUsers.map(u => (
                  <div key={u._id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <Avatar user={u} size={36} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'Geist, sans-serif', fontWeight: 700, fontSize: 14, color: '#0F172A' }}>{u.fullName}</div>
                      <div style={{ fontSize: 12, color: '#94A3B8' }}>@{u.username} · {u.department}</div>
                    </div>
                    <RoleBadge role={u.role} />
                    <span style={{ fontSize: 11, color: '#94A3B8' }}>{timeAgo(u.createdAt)}</span>
                  </div>
                ))}
              </div>

              {/* Faculty breakdown */}
              {stats.facultyBreakdown.length > 0 && (
                <div style={{ ...s.breakdownCard, marginTop: 16 }}>
                  <div style={s.sectionTitle}>🏛️ Top Faculties</div>
                  {stats.facultyBreakdown.map(item => (
                    <div key={item._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #F8FAFC' }}>
                      <span style={{ fontSize: 13, color: '#374151' }}>{item._id || 'Not set'}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#2563EB' }}>{item.count} students</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── USERS TAB ── */}
      {activeTab === 'users' && (
        <div style={{ animation: 'fadeUp 0.3s ease forwards' }}>
          {/* Search + filter */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 15 }}>🔍</span>
              <input value={userSearch} onChange={e => setUserSearch(e.target.value)}
                placeholder="Search by name, email, matric..." style={{ ...s.searchInput, paddingLeft: 38 }} />
            </div>
            <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={s.select}>
              <option value="">All Roles</option>
              {ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
            </select>
          </div>

          {/* Results count */}
          {usersMeta.total > 0 && (
            <div style={{ fontSize: 13, color: '#64748B', marginBottom: 10 }}>
              Showing {users.length} of {usersMeta.total} users
            </div>
          )}

          {usersLoading && users.length === 0 ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
              <div style={s.spinner} />
            </div>
          ) : users.length === 0 ? (
            <div style={s.emptyState}>
              <span style={{ fontSize: 40 }}>👥</span>
              <p style={{ color: '#64748B', marginTop: 12, fontSize: 14 }}>No users found</p>
            </div>
          ) : (
            <div style={s.listCard}>
              {users.map(u => (
                <UserRow
                  key={u._id}
                  user={u}
                  currentUser={user}
                  onRoleChange={handleRoleChange}
                  onVerify={handleVerify}
                  onSuspend={handleSuspend}
                />
              ))}
              {usersMeta.hasMore && (
                <button onClick={() => loadUsers(userPage + 1)}
                  disabled={usersLoading}
                  style={s.loadMoreBtn}>
                  {usersLoading ? 'Loading...' : 'Load more users'}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── POSTS TAB ── */}
      {activeTab === 'posts' && (
        <div style={{ animation: 'fadeUp 0.3s ease forwards' }}>
          <div style={{ position: 'relative', marginBottom: 14 }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 15 }}>🔍</span>
            <input value={postSearch} onChange={e => setPostSearch(e.target.value)}
              placeholder="Search posts by content..." style={{ ...s.searchInput, paddingLeft: 38 }} />
          </div>

          {postsLoading && posts.length === 0 ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
              <div style={s.spinner} />
            </div>
          ) : posts.length === 0 ? (
            <div style={s.emptyState}>
              <span style={{ fontSize: 40 }}>📝</span>
              <p style={{ color: '#64748B', marginTop: 12, fontSize: 14 }}>No posts found</p>
            </div>
          ) : (
            <div style={s.listCard}>
              {postsMeta.total && (
                <div style={{ padding: '10px 16px', borderBottom: '1px solid #F1F5F9', fontSize: 13, color: '#64748B' }}>
                  {posts.length} of {postsMeta.total} posts
                </div>
              )}
              {posts.map(p => (
                <PostRow key={p._id} post={p} onDelete={handleDeletePost} />
              ))}
              {postsMeta.hasMore && (
                <button onClick={() => loadPosts(postPage + 1)}
                  disabled={postsLoading}
                  style={s.loadMoreBtn}>
                  {postsLoading ? 'Loading...' : 'Load more posts'}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Styles ───────────────────────────────────────────────
const s = {
  page:      { paddingBottom: 80, fontFamily: "'DM Sans', sans-serif" },
  pageTitle: { fontFamily: 'Geist, sans-serif', fontWeight: 800, fontSize: 26, color: '#0F172A', margin: 0 },
  backBtn:   { padding: '8px 16px', borderRadius: 10, border: '1.5px solid #E2E8F0', background: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#374151', fontFamily: "'DM Sans', sans-serif" },

  tabs:      { display: 'flex', gap: 4, marginBottom: 20, background: 'white', padding: 5, borderRadius: 12, border: '1px solid #E2E8F0' },
  tab:       { flex: 1, padding: '9px', borderRadius: 8, border: 'none', background: 'transparent', fontSize: 13, fontWeight: 600, color: '#64748B', cursor: 'pointer', transition: 'all 0.15s', fontFamily: "'DM Sans', sans-serif" },
  tabActive: { background: '#0F172A', color: 'white' },

  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20, className: 'admin-stats-grid' },
  statCard:  { background: 'white', borderRadius: 14, padding: '16px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, textAlign: 'center' },
  statIcon:  { width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 4 },
  statNum:   { fontFamily: 'Geist, sans-serif', fontWeight: 800, fontSize: 26, color: '#0F172A', lineHeight: 1 },
  statLabel: { fontSize: 12, color: '#64748B', fontWeight: 600 },
  statSub:   { fontSize: 11, color: '#94A3B8', marginTop: 2 },

  sectionTitle:  { fontFamily: 'Geist, sans-serif', fontWeight: 700, fontSize: 14, color: '#0F172A', marginBottom: 12 },
  breakdownCard: { background: 'white', borderRadius: 14, padding: 16, border: '1px solid #E2E8F0' },

  listCard: { background: 'white', borderRadius: 14, border: '1px solid #E2E8F0', overflow: 'hidden' },
  userRow:  { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid #F8FAFC', flexWrap: 'wrap' },
  userName: { fontFamily: 'Geist, sans-serif', fontWeight: 700, fontSize: 14, color: '#0F172A' },
  userMeta: { fontSize: 12, color: '#94A3B8', marginTop: 2 },

  verifiedBadge:  { background: '#2563EB', color: 'white', borderRadius: '50%', width: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 },
  suspendedBadge: { background: '#FEF2F2', color: '#EF4444', borderRadius: 20, padding: '1px 8px', fontSize: 11, fontWeight: 700 },

  roleSelect: { padding: '5px 10px', borderRadius: 8, border: '1.5px solid #E2E8F0', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Geist, sans-serif', minWidth: 110 },
  verifyBtn:  { width: 32, height: 32, borderRadius: 8, border: 'none', background: '#F0FDF4', color: '#16A34A', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  suspendBtn: { width: 32, height: 32, borderRadius: 8, border: 'none', fontSize: 14, cursor: 'pointer' },
  viewBtn:    { width: 32, height: 32, borderRadius: 8, border: '1.5px solid #E2E8F0', background: 'white', fontSize: 14, cursor: 'pointer' },

  searchInput: { width: '100%', padding: '10px 12px', border: '1.5px solid #E2E8F0', borderRadius: 12, fontSize: 13, color: '#0F172A', background: '#F8FAFC', fontFamily: "'DM Sans', sans-serif" },
  select:      { padding: '10px 12px', border: '1.5px solid #E2E8F0', borderRadius: 12, fontSize: 13, color: '#0F172A', background: '#F8FAFC', fontFamily: "'DM Sans', sans-serif", minWidth: 130 },
  loadMoreBtn: { width: '100%', padding: 12, border: 'none', borderTop: '1px solid #F1F5F9', background: 'white', fontSize: 13, fontWeight: 600, color: '#2563EB', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" },
  emptyState:  { textAlign: 'center', padding: '60px 20px' },
  spinner:     { width: 28, height: 28, border: '3px solid #E2E8F0', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 0.7s linear infinite' },
};

export default AdminDashboard;
