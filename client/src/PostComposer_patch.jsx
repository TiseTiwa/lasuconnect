// ─────────────────────────────────────────────────────────
//  REPLACE the PostComposer component in FeedPage.jsx
//  with this version — it adds real image attachment support.
//
//  Also add this import at the top of FeedPage.jsx:
//  import useUpload from '../../hooks/useUpload';
// ─────────────────────────────────────────────────────────

const PostComposer = ({ user, onPost }) => {
  const [text, setText]             = useState('');
  const [feedType, setFeedType]     = useState('social');
  const [expanded, setExpanded]     = useState(false);
  const [error, setError]           = useState('');
  const [previews, setPreviews]     = useState([]); // local preview URLs
  const [mediaFiles, setMediaFiles] = useState([]); // actual File objects
  const [posting, setPosting]       = useState(false);
  const fileInputRef                = useRef(null);
  const { upload, uploading, progress } = useUpload();

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    // Max 4 images
    const combined = [...mediaFiles, ...files].slice(0, 4);
    setMediaFiles(combined);

    // Generate local previews
    const newPreviews = combined.map(f => URL.createObjectURL(f));
    setPreviews(newPreviews);

    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const removeImage = (index) => {
    setMediaFiles(p => p.filter((_, i) => i !== index));
    setPreviews(p => p.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if ((!text.trim() && mediaFiles.length === 0) || posting) return;
    setPosting(true);
    setError('');

    try {
      let mediaUrls = [];
      let mediaType = 'text';

      // Upload images first if any
      if (mediaFiles.length > 0) {
        const uploadData = await upload(mediaFiles, 'post');
        mediaUrls = uploadData.mediaUrls;
        mediaType = uploadData.mediaType;
      }

      const res = await createPost({
        content: text.trim(),
        feedType,
        mediaUrls,
        mediaType,
      });

      // Reset form
      setText('');
      setMediaFiles([]);
      setPreviews([]);
      setExpanded(false);
      onPost(res.data.data.post);

    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to post. Try again.');
    }
    setPosting(false);
  };

  const isSubmitting = posting || uploading;
  const canPost = (text.trim() || mediaFiles.length > 0) && !isSubmitting;

  return (
    <div style={cs.composer}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,video/mp4"
        multiple
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      <div style={cs.composerTop}>
        <Avatar user={user} size={40} />
        <div style={{ flex: 1 }}>
          <textarea
            placeholder={`What's on your mind, ${user?.fullName?.split(' ')[0]}? 🎓`}
            value={text}
            onChange={e => { setText(e.target.value); setError(''); }}
            onFocus={() => setExpanded(true)}
            style={{ ...cs.composerInput, height: expanded ? '90px' : '44px' }}
          />
        </div>
      </div>

      {/* Image previews */}
      {previews.length > 0 && (
        <div style={cs.previewGrid}>
          {previews.map((url, i) => (
            <div key={i} style={cs.previewItem}>
              <img src={url} alt="" style={cs.previewImg} />
              <button onClick={() => removeImage(i)} style={cs.removeBtn}>✕</button>
            </div>
          ))}
          {previews.length < 4 && (
            <button onClick={() => fileInputRef.current?.click()} style={cs.addMoreBtn}>
              <span style={{ fontSize: 22 }}>+</span>
              <span style={{ fontSize: 11, marginTop: 2 }}>Add more</span>
            </button>
          )}
        </div>
      )}

      {/* Upload progress */}
      {uploading && (
        <div style={cs.progressBar}>
          <div style={{ ...cs.progressFill, width: `${progress}%` }} />
          <span style={cs.progressText}>Uploading media... {progress}%</span>
        </div>
      )}

      {/* Error */}
      {error && <div style={cs.composerError}>⚠️ {error}</div>}

      {expanded && (
        <div style={cs.composerActions}>
          <div style={cs.composerLeft}>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={mediaFiles.length >= 4}
              style={{ ...cs.composerBtn, opacity: mediaFiles.length >= 4 ? 0.5 : 1 }}
            >
              📷 {mediaFiles.length > 0 ? `${mediaFiles.length}/4` : 'Photo'}
            </button>
            <button style={cs.composerBtn}>🎬 Video</button>
            <button style={cs.composerBtn}>😂 Meme</button>
          </div>
          <div style={cs.composerRight}>
            <select
              value={feedType}
              onChange={e => setFeedType(e.target.value)}
              style={cs.feedSelect}
            >
              <option value="social">🌐 Social</option>
              <option value="academic">🎓 Academic</option>
            </select>
            <button
              onClick={handleSubmit}
              disabled={!canPost}
              style={{ ...cs.postBtn, opacity: canPost ? 1 : 0.5 }}
            >
              {isSubmitting ? (uploading ? `${progress}%` : 'Posting...') : 'Post'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Styles to add/merge into the s object in FeedPage.jsx ─
const cs = {
  composer: { background: 'white', borderRadius: 16, padding: 16, border: '1px solid #E2E8F0', marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
  composerTop: { display: 'flex', gap: 12, alignItems: 'flex-start' },
  composerInput: { width: '100%', border: '1.5px solid #E2E8F0', borderRadius: 12, padding: '10px 14px', fontSize: 14, color: '#0F172A', background: '#F8FAFC', transition: 'height 0.2s', lineHeight: 1.5, fontFamily: "'DM Sans', sans-serif", resize: 'none' },

  previewGrid: { display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  previewItem: { position: 'relative', width: 80, height: 80, borderRadius: 10, overflow: 'hidden', flexShrink: 0 },
  previewImg: { width: '100%', height: '100%', objectFit: 'cover' },
  removeBtn: { position: 'absolute', top: 3, right: 3, width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', color: 'white', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  addMoreBtn: { width: 80, height: 80, borderRadius: 10, border: '2px dashed #E2E8F0', background: '#F8FAFC', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontFamily: "'DM Sans', sans-serif" },

  progressBar: { position: 'relative', height: 6, background: '#E2E8F0', borderRadius: 4, marginTop: 10, overflow: 'hidden' },
  progressFill: { height: '100%', background: 'linear-gradient(90deg, #1D4ED8, #3B82F6)', borderRadius: 4, transition: 'width 0.2s' },
  progressText: { position: 'absolute', right: 0, top: 8, fontSize: 11, color: '#94A3B8', fontFamily: "'DM Sans', sans-serif" },

  composerError: { background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#DC2626', marginTop: 10 },

  composerActions: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTop: '1px solid #F1F5F9', flexWrap: 'wrap', gap: 8 },
  composerLeft: { display: 'flex', gap: 6 },
  composerRight: { display: 'flex', gap: 8, alignItems: 'center' },
  composerBtn: { padding: '6px 12px', border: '1.5px solid #E2E8F0', borderRadius: 8, background: 'white', fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" },
  feedSelect: { padding: '6px 10px', border: '1.5px solid #E2E8F0', borderRadius: 8, background: 'white', fontSize: 13, color: '#475569', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" },
  postBtn: { padding: '7px 20px', background: 'linear-gradient(135deg, #1D4ED8, #3B82F6)', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Geist, sans-serif', transition: 'opacity 0.15s' },
};
