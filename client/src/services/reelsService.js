import api from './api';

export const getReels       = (page = 1)     => api.get(`/reels?page=${page}&limit=10`);
export const getTrending    = ()             => api.get('/reels/trending');
export const getUserReels   = (username, page = 1) => api.get(`/reels/user/${username}?page=${page}&limit=12`); // ← new
export const uploadReel     = (formData)     => api.post('/reels', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});
export const toggleLike     = (reelId)       => api.post(`/reels/${reelId}/like`);
export const getComments    = (reelId)       => api.get(`/reels/${reelId}/comments`);
export const addComment     = (reelId, content) => api.post(`/reels/${reelId}/comments`, { content });
export const deleteReel     = (reelId)       => api.delete(`/reels/${reelId}`);
