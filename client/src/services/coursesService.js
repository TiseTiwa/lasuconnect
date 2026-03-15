import api from './api';

// ── Discovery ─────────────────────────────────────────────
export const getCourses         = (params = {}) => api.get('/courses', { params });
export const getMyCourses       = ()             => api.get('/courses/my');
export const getSuggestedCourses = ()            => api.get('/courses/suggestions');

// ── Single course ─────────────────────────────────────────
export const getCourse          = (id)           => api.get(`/courses/${id}`);
export const createCourse       = (data)         => api.post('/courses', data);
export const toggleJoin         = (id)           => api.post(`/courses/${id}/join`);

// ── Resources ─────────────────────────────────────────────
export const getResources = (courseId, params = {}) =>
  api.get(`/courses/${courseId}/resources`, { params });

export const uploadResource = (courseId, formData) =>
  api.post(`/courses/${courseId}/resources`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const toggleResourceLike = (courseId, resourceId) =>
  api.post(`/courses/${courseId}/resources/${resourceId}/like`);

export const deleteResource = (courseId, resourceId) =>
  api.delete(`/courses/${courseId}/resources/${resourceId}`);

export const incrementDownload = (courseId, resourceId) =>
  api.patch(`/courses/${courseId}/resources/${resourceId}/download`);

// ── Discussions ───────────────────────────────────────────
export const getDiscussions  = (courseId, page = 1) =>
  api.get(`/courses/${courseId}/discussions?page=${page}`);

export const postDiscussion  = (courseId, data) =>
  api.post(`/courses/${courseId}/discussions`, data);
