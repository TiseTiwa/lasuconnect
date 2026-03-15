import api from './api';

export const getProfile     = (username)       => api.get(`/users/${username}`);
export const updateProfile  = (data)           => api.patch('/users/me', data);
export const toggleFollow   = (username)       => api.post(`/users/${username}/follow`);
export const getFollowers   = (username)       => api.get(`/users/${username}/followers`);
export const getFollowing   = (username)       => api.get(`/users/${username}/following`);
export const searchUsers    = (q, page = 1)    => api.get(`/users/search?q=${encodeURIComponent(q)}&page=${page}`);
export const getSuggestions = ()               => api.get('/users/suggestions');
