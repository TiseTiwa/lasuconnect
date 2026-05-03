import api from './api';

// ── Stats ─────────────────────────────────────────────────
export const getStats = () =>
  api.get('/admin/stats');

// ── Users ─────────────────────────────────────────────────
export const getUsers = (params = {}) =>
  api.get('/admin/users', { params });

export const updateUserRole = (userId, role) =>
  api.patch(`/admin/users/${userId}/role`, { role });

export const verifyUser = (userId) =>
  api.patch(`/admin/users/${userId}/verify`);

export const toggleSuspend = (userId) =>
  api.patch(`/admin/users/${userId}/suspend`);

// ── Posts ─────────────────────────────────────────────────
export const getPosts = (params = {}) =>
  api.get('/admin/posts', { params });

export const adminDeletePost = (postId) =>
  api.delete(`/admin/posts/${postId}`);
