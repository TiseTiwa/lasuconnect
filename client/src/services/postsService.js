import api from './api';

// ── Feed ──────────────────────────────────────────────────
export const getFeed = (params = {}) =>
  api.get('/posts/feed', { params });

// ── Single post ───────────────────────────────────────────
export const getPost = (postId) =>
  api.get(`/posts/${postId}`);

// ── Create / delete ───────────────────────────────────────
export const createPost = (data) =>
  api.post('/posts', data);

export const deletePost = (postId) =>
  api.delete(`/posts/${postId}`);

// ── Likes ─────────────────────────────────────────────────
export const toggleLike = (postId) =>
  api.post(`/posts/${postId}/like`);

// ── Comments ──────────────────────────────────────────────
export const getComments = (postId, params = {}) =>
  api.get(`/posts/${postId}/comments`, { params });

export const addComment = (postId, content) =>
  api.post(`/posts/${postId}/comments`, { content });

export const deleteComment = (postId, commentId) =>
  api.delete(`/posts/${postId}/comments/${commentId}`);

export const likeComment = (postId, commentId) =>
  api.post(`/posts/${postId}/comments/${commentId}/like`);

// ── Shares / Reposts ──────────────────────────────────────
export const repostPost = (postId, quote = '') =>
  api.post(`/posts/${postId}/share`, { quote });

// ── Saves / bookmarks ─────────────────────────────────────
export const savePost = (postId) =>
  api.post(`/posts/${postId}/save`);

// ── User posts ────────────────────────────────────────────
export const getUserPosts = (username, params = {}) =>
  api.get(`/posts/user/${username}`, { params });

// ── Saved posts ───────────────────────────────────────────
export const getSavedPosts = (params = {}) =>
  api.get('/posts/saved', { params });
