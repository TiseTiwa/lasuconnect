// ─────────────────────────────────────────────────────────
//  RoleBadge.jsx
//  Drop-in badge shown next to any user's name across the app
//  Usage: <RoleBadge role={user.role} roleVerified={user.roleVerified} />
// ─────────────────────────────────────────────────────────

const BADGE_CONFIG = {
  lecturer: {
    icon:    '👨‍🏫',
    label:   'Lecturer',
    color:   '#7C3AED',
    bg:      '#F5F3FF',
    border:  '#DDD6FE',
  },
  course_rep: {
    icon:    '📋',
    label:   'Course Rep',
    color:   '#059669',
    bg:      '#F0FDF4',
    border:  '#BBF7D0',
  },
  admin: {
    icon:    '⚙️',
    label:   'Admin',
    color:   '#D97706',
    bg:      '#FFFBEB',
    border:  '#FDE68A',
  },
  super_admin: {
    icon:    '🛡️',
    label:   'Super Admin',
    color:   '#DC2626',
    bg:      '#FEF2F2',
    border:  '#FECACA',
  },
};

const RoleBadge = ({ role, roleVerified = true, size = 'sm' }) => {
  // Students get no badge — keep feeds clean
  if (!role || role === 'student') return null;

  const config = BADGE_CONFIG[role];
  if (!config) return null;

  const isPending = (role === 'course_rep') && !roleVerified;
  const isSmall   = size === 'sm';

  return (
    <span style={{
      display:        'inline-flex',
      alignItems:     'center',
      gap:            3,
      fontSize:       isSmall ? 10 : 12,
      fontWeight:     700,
      borderRadius:   20,
      padding:        isSmall ? '1px 7px' : '3px 10px',
      background:     isPending ? '#F1F5F9'    : config.bg,
      color:          isPending ? '#64748B'    : config.color,
      border:         `1px solid ${isPending ? '#E2E8F0' : config.border}`,
      fontFamily:     'Geist, sans-serif',
      letterSpacing:  '0.01em',
      whiteSpace:     'nowrap',
      flexShrink:     0,
    }}>
      <span style={{ fontSize: isSmall ? 10 : 12 }}>{config.icon}</span>
      {config.label}
      {isPending && <span style={{ opacity: 0.7 }}> (Pending)</span>}
    </span>
  );
};

export default RoleBadge;
