import api from './api';

export const getStreams    = (params = {}) => api.get('/live', { params });
export const getStream     = (id)          => api.get(`/live/${id}`);
export const createStream  = (data)        => api.post('/live', data);
export const startStream   = (id)          => api.patch(`/live/${id}/start`);
export const endStream     = (id)          => api.patch(`/live/${id}/end`);
export const joinStream    = (id)          => api.post(`/live/${id}/join`);
export const leaveStream   = (id)          => api.post(`/live/${id}/leave`);
export const deleteStream  = (id)          => api.delete(`/live/${id}`);
