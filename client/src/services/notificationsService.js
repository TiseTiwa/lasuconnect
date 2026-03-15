import api from './api';

export const getNotifications  = (page = 1) => api.get(`/notifications?page=${page}&limit=20`);
export const getUnreadCount    = ()         => api.get('/notifications/unread-count');
export const markAsRead        = (id)       => api.patch(`/notifications/${id}/read`);
export const markAllAsRead     = ()         => api.patch('/notifications/read-all');
export const deleteNotification = (id)     => api.delete(`/notifications/${id}`);
export const clearAll          = ()         => api.delete('/notifications');
