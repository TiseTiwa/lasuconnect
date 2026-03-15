import axios from 'axios';

// ─────────────────────────────────────────────────────────
//  Axios instance configured for LASUConnect API.
//  All API calls should use this instance, not raw axios.
// ─────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
});

// ── Request Interceptor — attach JWT access token ─────────
api.interceptors.request.use(
  (config) => {
    // Access token is stored in memory (Zustand auth store)
    // We read it from localStorage as a fallback during dev
    // In production, use Zustand store to inject it
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor — handle token refresh ───────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and we haven't already retried — attempt token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const { data } = await axios.post('/api/auth/refresh-token', {}, {
          withCredentials: true, // The refresh token lives in an HTTP-only cookie
        });

        const newAccessToken = data.data.accessToken;
        localStorage.setItem('accessToken', newAccessToken);

        // Retry the original failed request with new token
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);

      } catch (refreshError) {
        // Refresh failed — force logout
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
