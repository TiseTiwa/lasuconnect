// ─────────────────────────────────────────────────────────
//  PATCH INSTRUCTIONS for ProfilePage.jsx
//  Add these two imports at the top of the file:
//
//  import ImageUpload from '../../components/ImageUpload';
//  import useAuthStore from '../../context/useAuthStore';  ← already there
//
//  Then replace the Cover photo section and Avatar section
//  with the code below.
// ─────────────────────────────────────────────────────────

// ── REPLACE the cover div (currently looks like this):
// <div style={{ ...s.cover, background: profile?.coverUrl ? ... }} />
//
// WITH THIS:

const CoverSection = ({ profile, isMe, onCoverUpdate }) => (
  isMe ? (
    <ImageUpload
      endpoint="cover"
      shape="banner"
      currentUrl={profile?.coverUrl}
      onSuccess={(data) => onCoverUpdate(data.coverUrl)}
    >
      {/* Shown when no cover exists yet */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 6, color: '#94A3B8',
      }}>
        <span style={{ fontSize: 28 }}>🖼️</span>
        <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>
          Add cover photo
        </span>
      </div>
    </ImageUpload>
  ) : (
    <div style={{
      width: '100%', height: 180,
      borderRadius: '16px 16px 0 0',
      background: profile?.coverUrl
        ? `url(${profile.coverUrl}) center/cover`
        : `linear-gradient(135deg,
            hsl(${(profile?.username?.charCodeAt(0) || 200) * 3}, 60%, 35%),
            hsl(${(profile?.username?.charCodeAt(0) || 200) * 3 + 40}, 70%, 50%))`,
    }} />
  )
);

// ── REPLACE the Avatar in the avatarRow section:
// <Avatar user={profile} size={90} />
//
// WITH THIS:

const AvatarSection = ({ profile, isMe, onAvatarUpdate }) => {
  const initials = profile?.fullName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  const colors = ['#1D4ED8','#7C3AED','#DB2777','#059669','#D97706','#DC2626'];
  const color = colors[(profile?.username?.charCodeAt(0) || 0) % colors.length];

  if (isMe) {
    return (
      <div style={{ position: 'relative' }}>
        <ImageUpload
          endpoint="avatar"
          shape="circle"
          size={90}
          currentUrl={profile?.avatarUrl}
          onSuccess={(data) => onAvatarUpdate(data.avatarUrl)}
        >
          {/* Shown when no avatar exists */}
          <div style={{
            width: 90, height: 90, borderRadius: '50%',
            background: color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: 'white', fontWeight: 800, fontSize: 32, fontFamily: 'Geist, sans-serif' }}>
              {initials}
            </span>
          </div>
        </ImageUpload>
        {/* Camera badge */}
        <div style={{
          position: 'absolute', bottom: 2, right: 2,
          width: 26, height: 26, borderRadius: '50%',
          background: '#2563EB', border: '2px solid white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, pointerEvents: 'none',
        }}>
          📷
        </div>
      </div>
    );
  }

  return (
    <div style={{
      width: 90, height: 90, borderRadius: '50%',
      background: profile?.avatarUrl ? 'transparent' : color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', border: '3px solid white',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)', flexShrink: 0,
    }}>
      {profile?.avatarUrl
        ? <img src={profile.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span style={{ color: 'white', fontWeight: 800, fontSize: 32, fontFamily: 'Geist, sans-serif' }}>{initials}</span>
      }
    </div>
  );
};

// ── In ProfilePage JSX, use them like this:
//
// <CoverSection profile={profile} isMe={isMe} onCoverUpdate={(url) => {
//   setProfile(p => ({ ...p, coverUrl: url }));
//   updateUser({ coverUrl: url });
// }} />
//
// <AvatarSection profile={profile} isMe={isMe} onAvatarUpdate={(url) => {
//   setProfile(p => ({ ...p, avatarUrl: url }));
//   updateUser({ avatarUrl: url });
// }} />
