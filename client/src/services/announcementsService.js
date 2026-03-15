import api from './api';

export const getAnnouncements   = (params = {}) => api.get('/announcements', { params });
export const getUnreadCount     = ()             => api.get('/announcements/unread-count');
export const getAnnouncement    = (id)           => api.get(`/announcements/${id}`);
export const markAsRead         = (id)           => api.patch(`/announcements/${id}/read`);
export const markAllAsRead      = ()             => api.patch('/announcements/read-all');
export const deleteAnnouncement = (id)           => api.delete(`/announcements/${id}`);
export const togglePin          = (id)           => api.patch(`/announcements/${id}/pin`);

export const createAnnouncement = (formData) =>
  api.post('/announcements', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

// ── Comments ──────────────────────────────────────────────
export const getComments    = (id)              => api.get(`/announcements/${id}/comments`);
export const addComment     = (id, content)     => api.post(`/announcements/${id}/comments`, { content });
export const deleteComment  = (id, commentId)   => api.delete(`/announcements/${id}/comments/${commentId}`);
