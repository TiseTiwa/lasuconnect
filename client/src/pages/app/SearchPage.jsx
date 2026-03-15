import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchUsers, toggleFollow, getSuggestions } from '../../services/usersService';
import useAuthStore from '../../context/useAuthStore';

// ── User Card ──────────────────────────────────────────────
const UserCard = ({ user, onFollow, currentUserId }) => {
  const navigate = useNavigate();
  const [following, setFollowing] = useState(user.isFollowing);
  const [loading, setLoading] = useState(false);
  const isMe = user._id === currentUserId;

  const handleFollow = async (e) => {
    e.stopPropagation();
    if (loading || isMe) return;
    setLoading(true);
    setFollowing(p => !p);
    try {
      await toggleFollow(user.username);
    } catch {
      setFollowing(p => !p);
    }
    setLoading(false);
  };

  const colors = ['#1D4ED8','#7C3AED','#DB2777','#059669','#D97706','#DC2626'];
  const color = colors[(user?.username?.charCodeAt(0) || 0) % colors.length];
  const initials = user.fullName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div onClick={() => navigate(`/profile/${user.username}`)} style={s.userCard}>
      {/* Avatar */}
      <div style={{ width: 48, height: 48, borderRadius: '50%', background: user.avatarUrl ? 'transparent' : color, overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {user.avatarUrl
          ? <img src={user.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ color: 'white', fontWeight: 800, fontSize: 16, fontFamily: 'Geist, sans-serif' }}>{initials}</span>
        }
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={s.cardNameRow}>
          <span style={s.cardName}>{user.fullName}</span>
          {user.isVerified && <span style={s.verified}>✓</span>}
        </div>
        <div style={s.cardMeta}>@{user.username} · {user.department}</div>
        <div style={s.cardMeta}>{user.faculty} · {user.level} Level</div>
        {user.badges?.length > 0 && (
          <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
            {user.badges.map(b => <span key={b} style={s.badge}>{b}</span>)}
          </div>
        )}
      </div>

      {/* Follow button */}
      {!isMe && (
        <button onClick={handleFollow} disabled={loading}
          style={{ ...s.followBtn, ...(following ? s.followingBtn : {}) }}>
          {following ? '✓ Following' : '+ Follow'}
        </button>
      )}
    </div>
  );
};

// ── Main Search Page ───────────────────────────────────────
const SearchPage = () => {
  const { user: currentUser } = useAuthStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  // Load suggestions on mount
  useEffect(() => {
    getSuggestions()
      .then(res => setSuggestions(res.data.data.suggestions))
      .catch(() => {});
    inputRef.current?.focus();
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); setSearched(false); return; }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchUsers(query.trim());
        setResults(res.data.data.users);
        setSearched(true);
      } catch (_) {}
      setLoading(false);
    }, 400);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const FILTERS = [
    { id: 'all',        label: '👥 All' },
    { id: 'department', label: '📚 My Dept' },
    { id: 'faculty',    label: '🏛️ My Faculty' },
  ];

  const filtered = results.filter(u => {
    if (activeFilter === 'department') return u.department === currentUser?.department;
    if (activeFilter === 'faculty') return u.faculty === currentUser?.faculty;
    return true;
  });

  return (
    <div style={s.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        input:focus { outline: none; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        .card-anim { animation: fadeUp 0.25s ease forwards; }
      `}</style>

      {/* Header */}
      <div style={s.pageHeader}>
        <h1 style={s.pageTitle}>Search</h1>
        <p style={s.pageSubtitle}>Find LASU students, classmates & more</p>
      </div>

      {/* Search input */}
      <div style={s.searchBox}>
        <span style={s.searchIcon}>🔍</span>
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by name, username, department..."
          style={s.searchInput}
        />
        {query && (
          <button onClick={() => { setQuery(''); setResults([]); setSearched(false); }} style={s.clearBtn}>✕</button>
        )}
      </div>

      {/* Filter tabs — only show when there are results */}
      {searched && results.length > 0 && (
        <div style={s.filters}>
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setActiveFilter(f.id)}
              style={{ ...s.filterBtn, ...(activeFilter === f.id ? s.filterActive : {}) }}>
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={s.loadingRow}>
          <div style={s.spinner} />
          <span style={{ fontSize: 14, color: '#64748B' }}>Searching...</span>
        </div>
      )}

      {/* Search results */}
      {!loading && searched && (
        <div style={s.section}>
          <div style={s.sectionHeader}>
            <span style={s.sectionTitle}>
              {filtered.length === 0 ? 'No results' : `${filtered.length} student${filtered.length !== 1 ? 's' : ''} found`}
            </span>
          </div>

          {filtered.length === 0 ? (
            <div style={s.emptyState}>
              <span style={{ fontSize: 40 }}>🔍</span>
              <p style={s.emptyText}>
                No students found for <strong>"{query}"</strong>
                {activeFilter !== 'all' && ' in this filter — try All'}
              </p>
            </div>
          ) : (
            <div style={s.list}>
              {filtered.map((user, i) => (
                <div key={user._id} className="card-anim" style={{ animationDelay: `${i * 0.04}s`, opacity: 0 }}>
                  <UserCard user={user} currentUserId={currentUser?._id} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Suggestions — shown when not searching */}
      {!query && suggestions.length > 0 && (
        <div style={s.section}>
          <div style={s.sectionHeader}>
            <span style={s.sectionTitle}>👥 People you may know</span>
            <span style={s.sectionSub}>From your department & faculty</span>
          </div>
          <div style={s.list}>
            {suggestions.map((user, i) => (
              <div key={user._id} className="card-anim" style={{ animationDelay: `${i * 0.05}s`, opacity: 0 }}>
                <UserCard user={user} currentUserId={currentUser?._id} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state — no query, no suggestions */}
      {!query && suggestions.length === 0 && !loading && (
        <div style={s.emptyState}>
          <span style={{ fontSize: 48, display: 'block', marginBottom: 12 }}>🎓</span>
          <p style={s.emptyText}>Start typing to find LASU students</p>
        </div>
      )}
    </div>
  );
};

// ─── Styles ───────────────────────────────────────────────
const s = {
  page: { paddingBottom: 80, fontFamily: "'DM Sans', sans-serif" },
  pageHeader: { marginBottom: 20 },
  pageTitle: { fontFamily: 'Geist, sans-serif', fontWeight: 800, fontSize: 26, color: '#0F172A', lineHeight: 1.1 },
  pageSubtitle: { fontSize: 14, color: '#64748B', marginTop: 4 },

  searchBox: { position: 'relative', display: 'flex', alignItems: 'center', marginBottom: 16 },
  searchIcon: { position: 'absolute', left: 14, fontSize: 18, pointerEvents: 'none', zIndex: 1 },
  searchInput: { width: '100%', padding: '13px 44px', border: '2px solid #E2E8F0', borderRadius: 14, fontSize: 15, color: '#0F172A', background: 'white', fontFamily: "'DM Sans', sans-serif", transition: 'border 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
  clearBtn: { position: 'absolute', right: 14, background: '#E2E8F0', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', fontSize: 12, color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center' },

  filters: { display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' },
  filterBtn: { padding: '6px 14px', borderRadius: 20, border: '1.5px solid #E2E8F0', background: 'white', fontSize: 12, fontWeight: 600, color: '#64748B', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'all 0.15s' },
  filterActive: { background: '#EFF6FF', borderColor: '#2563EB', color: '#2563EB' },

  loadingRow: { display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', padding: '32px 0' },
  spinner: { width: 20, height: 20, border: '2.5px solid #E2E8F0', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 0.7s linear infinite' },

  section: { marginBottom: 24 },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 },
  sectionTitle: { fontFamily: 'Geist, sans-serif', fontWeight: 700, fontSize: 15, color: '#0F172A' },
  sectionSub: { fontSize: 12, color: '#94A3B8' },

  list: { display: 'flex', flexDirection: 'column', gap: 8 },

  userCard: { background: 'white', borderRadius: 14, padding: '14px 16px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', transition: 'border-color 0.15s, box-shadow 0.15s', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
  cardNameRow: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 },
  cardName: { fontFamily: 'Geist, sans-serif', fontWeight: 700, fontSize: 14, color: '#0F172A' },
  verified: { background: '#2563EB', color: 'white', borderRadius: '50%', width: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0 },
  cardMeta: { fontSize: 12, color: '#94A3B8', lineHeight: 1.4 },
  badge: { fontSize: 10, background: '#FEF3C7', color: '#D97706', borderRadius: 20, padding: '1px 7px', fontWeight: 600 },

  followBtn: { padding: '6px 16px', borderRadius: 20, border: 'none', background: 'linear-gradient(135deg, #1D4ED8, #3B82F6)', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Geist, sans-serif', flexShrink: 0, whiteSpace: 'nowrap', transition: 'all 0.15s' },
  followingBtn: { background: '#F1F5F9', color: '#374151', border: '1.5px solid #E2E8F0' },

  emptyState: { textAlign: 'center', padding: '48px 20px' },
  emptyText: { fontSize: 14, color: '#64748B', lineHeight: 1.6, marginTop: 8 },
};

export default SearchPage;
