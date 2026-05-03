// ─────────────────────────────────────────────────────────
//  LASULogo.jsx
//  Drop-in logo component using the official LASU crest
//  Usage: <LASULogo size={40} /> or <LASULogo size={120} withText />
//
//  IMPORTANT: Copy lasuconnect-logo.png into:
//    client/public/lasuconnect-logo.png
//  Then this component references it as /lasuconnect-logo.png
// ─────────────────────────────────────────────────────────

const LASULogo = ({
  size       = 36,
  withText   = false,
  textSize   = 18,
  textColor  = 'var(--text-primary)',
  style      = {},
  className  = '',
  onClick,
}) => {
  return (
    <div
      className={className}
      onClick={onClick}
      style={{
        display:    'flex',
        alignItems: 'center',
        gap:        withText ? 10 : 0,
        cursor:     onClick ? 'pointer' : 'default',
        flexShrink: 0,
        ...style,
      }}
    >
      <img
        src="/lasuconnect-logo.png"
        alt="LASU Logo"
        width={size}
        height={size}
        style={{
          objectFit:  'contain',
          flexShrink: 0,
          display:    'block',
        }}
      />
      {withText && (
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize:   textSize,
            color:      textColor,
            letterSpacing: '-0.02em',
          }}>
            LASU
          </span>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 400,
            fontSize:   textSize * 0.65,
            color:      'var(--text-tertiary)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}>
            Connect
          </span>
        </div>
      )}
    </div>
  );
};

export default LASULogo;
