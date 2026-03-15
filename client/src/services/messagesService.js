import api from './api';

// ── Conversations ─────────────────────────────────────────
export const getConversations  = ()           => api.get('/messages/conversations');
export const getOrCreateDM     = (userId)     => api.post('/messages/conversations', { userId });
export const createGroup       = (data)       => api.post('/messages/conversations/group', data);
export const getConversation   = (id)         => api.get(`/messages/conversations/${id}`);
export const markAsRead        = (id)         => api.patch(`/messages/conversations/${id}/read`);
export const searchConversations = (q)        => api.get(`/messages/conversations/search?q=${encodeURIComponent(q)}`);

// ── Messages ──────────────────────────────────────────────
export const getMessages  = (convId, page = 1) => api.get(`/messages/conversations/${convId}/messages?page=${page}&limit=40`);
export const sendMessage  = (convId, data)     => api.post(`/messages/conversations/${convId}/messages`, data);
export const deleteMessage = (convId, msgId)   => api.delete(`/messages/conversations/${convId}/messages/${msgId}`);

// ── Media upload for messages ─────────────────────────────
export const uploadMessageMedia = (file) => {
  const formData = new FormData();
  formData.append('media', file);
  return api.post('/media/post', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
