import { useRef, useState } from 'react';
import useUpload from '../hooks/useUpload';

// ─────────────────────────────────────────────────────────
//  ImageUpload — Reusable image upload component.
//  Shows a clickable area, preview, upload progress bar,
//  and calls onSuccess(url) when upload completes.
//
//  Props:
//    endpoint   — 'avatar' | 'cover' | 'post'
//    onSuccess  — callback(data) called after successful upload
//    shape      — 'circle' | 'banner' (default: 'circle')
//    currentUrl — existing image URL to show as default preview
//    children   — trigger element (optional)
// ─────────────────────────────────────────────────────────
const ImageUpload = ({ endpoint, onSuccess, shape = 'circle', currentUrl, children, size = 90 }) => {
  const inputRef = useRef(null);
  const { upload, uploading, progress, error } = useUpload();
  const [preview, setPreview] = useState(currentUrl || null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show local preview immediately
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);

    try {
      const data = await upload(file, endpoint);
      const url = data.avatarUrl || data.coverUrl || data.mediaUrls?.[0];
      if (url) {
        setPreview(url);
        onSuccess?.(data);
      }
    } catch (_) {
      // Reset preview on error
      setPreview(currentUrl || null);
    }

    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const isBanner = shape === 'banner';

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {/* Trigger area */}
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        style={{
          position: 'relative',
          width: isBanner ? '100%' : size,
          height: isBanner ? 180 : size,
          borderRadius: isBanner ? '16px 16px 0 0' : '50%',
          overflow: 'hidden',
          cursor: uploading ? 'not-allowed' : 'pointer',
          background: preview ? 'transparent' : '#E2E8F0',
        }}
      >
        {/* Preview image */}
        {preview && (
          <img
            src={preview}
            alt="Preview"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}

        {/* Hover overlay */}
        {!uploading && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            opacity: 0,
            transition: 'opacity 0.2s',
            borderRadius: isBanner ? '16px 16px 0 0' : '50%',
          }}
            onMouseEnter={e => e.currentTarget.style.opacity = 1}
            onMouseLeave={e => e.currentTarget.style.opacity = 0}
          >
            <span style={{ fontSize: isBanner ? 28 : 20 }}>📷</span>
            <span style={{ color: 'white', fontSize: 11, fontWeight: 600, marginTop: 4, fontFamily: 'DM Sans, sans-serif' }}>
              {isBanner ? 'Change cover' : 'Change photo'}
            </span>
          </div>
        )}

        {/* Upload progress overlay */}
        {uploading && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <div style={{
              width: isBanner ? 120 : size * 0.7,
              height: 4, background: 'rgba(255,255,255,0.3)',
              borderRadius: 4, overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', background: 'white',
                width: `${progress}%`, transition: 'width 0.2s',
                borderRadius: 4,
              }} />
            </div>
            <span style={{ color: 'white', fontSize: 11, fontWeight: 700, fontFamily: 'DM Sans, sans-serif' }}>
              {progress}%
            </span>
          </div>
        )}

        {/* Custom children trigger */}
        {children && !preview && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {children}
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div style={{
          position: 'absolute', bottom: -28, left: '50%', transform: 'translateX(-50%)',
          background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6,
          padding: '3px 10px', fontSize: 11, color: '#DC2626', whiteSpace: 'nowrap',
          fontFamily: 'DM Sans, sans-serif',
        }}>
          ⚠️ {error}
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
