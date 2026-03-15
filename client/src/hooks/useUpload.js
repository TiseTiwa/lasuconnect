import { useState } from 'react';
import api from '../services/api';

// ─────────────────────────────────────────────────────────
//  useUpload — reusable hook for all media uploads.
//  Handles progress tracking, error state, and the API call.
//
//  Usage:
//    const { upload, uploading, progress, error } = useUpload();
//    const url = await upload(file, 'avatar');
// ─────────────────────────────────────────────────────────
const useUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress]   = useState(0);
  const [error, setError]         = useState('');

  // endpoint: 'avatar' | 'cover' | 'post' | 'document'
  // files: File or File[]
  const upload = async (files, endpoint) => {
    setUploading(true);
    setProgress(0);
    setError('');

    try {
      const formData = new FormData();
      const isMultiple = Array.isArray(files);

      if (isMultiple) {
        files.forEach(file => formData.append('media', file));
      } else {
        // Single file — field name matches the endpoint
        formData.append(endpoint === 'document' ? 'document' : endpoint, files);
      }

      const res = await api.post(`/media/${endpoint}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          const pct = Math.round((e.loaded * 100) / e.total);
          setProgress(pct);
        },
      });

      setUploading(false);
      setProgress(100);
      return res.data.data; // { avatarUrl } | { coverUrl } | { mediaUrls, mediaType } | { fileUrl }

    } catch (err) {
      const msg = err.response?.data?.message || 'Upload failed. Please try again.';
      setError(msg);
      setUploading(false);
      setProgress(0);
      throw new Error(msg);
    }
  };

  const reset = () => { setProgress(0); setError(''); };

  return { upload, uploading, progress, error, reset };
};

export default useUpload;
