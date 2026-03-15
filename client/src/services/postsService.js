import api from './api';

// ── Feed ──────────────────────────────────────────────────
export const getFeed = ({ feedType, page = 1, limit = 15 } = {}) => {
  const params = new URLSearchParams({ page, limit });
  if (feedType) params.append('feedType', feedType);
  return api.get(`/posts/feed?${params}`);
};

// ── Post CRUD ─────────────────────────────────────────────
export const createPost = (data) => api.post('/posts', data);
export const getPost    = (id)   => api.get(`/posts/${id}`);
export const updatePost = (id, data) => api.patch(`/posts/${id}`, data);
export const deletePost = (id)   => api.delete(`/posts/${id}`);

// ── Likes ─────────────────────────────────────────────────
export const toggleLike = (postId) => api.post(`/posts/${postId}/like`);

// ── Comments ──────────────────────────────────────────────
export const getComments    = (postId, page = 1) => api.get(`/posts/${postId}/comments?page=${page}`);
export const addComment     = (postId, content, parentComment = null) =>
  api.post(`/posts/${postId}/comments`, { content, parentComment });
export const deleteComment  = (postId, commentId) => api.delete(`/posts/${postId}/comments/${commentId}`);
export const toggleCommentLike = (postId, commentId) => api.post(`/posts/${postId}/comments/${commentId}/like`);

// ── User posts ────────────────────────────────────────────
export const getUserPosts = (username, page = 1) =>
  api.get(`/posts/user/${username}?page=${page}`);
