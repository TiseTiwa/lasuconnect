import axios from 'axios';

// ── Base instance ─────────────────────────────────────────
const api = axios.create({
  baseURL:         import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,           // sends cookies (refresh token)
  timeout:         15000,
});

// ── Request interceptor ───────────────────────────────────
// Attach access token from localStorage to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Refresh state ─────────────────────────────────────────
let isRefreshing    = false;
let failedQueue     = [];   // queue of requests waiting for new token

const processQueue  = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else       resolve(token);
  });
  failedQueue = [];
};

// ── Response interceptor ──────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // Only handle 401 that hasn't already been retried
    // AND is not the refresh endpoint itself (avoid infinite loop)
    const isRefreshEndpoint = original?.url?.includes('/auth/refresh-token');
    if (
      error.response?.status !== 401 ||
      original._retry           ||
      isRefreshEndpoint
    ) {
      return Promise.reject(error);
    }

    // If already refreshing, queue this request until we have a new token
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        })
        .catch((err) => Promise.reject(err));
    }

    original._retry = true;
    isRefreshing    = true;

    try {
      // Attempt token refresh — cookie is sent automatically
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/refresh-token`,
        {},
        { withCredentials: true }
      );

      const newToken = res.data?.data?.accessToken || res.data?.accessToken;
      if (!newToken) throw new Error('No access token in refresh response');

      localStorage.setItem('accessToken', newToken);
      api.defaults.headers.common.Authorization = `Bearer ${newToken}`;

      processQueue(null, newToken);

      // Retry the original failed request
      original.headers.Authorization = `Bearer ${newToken}`;
      return api(original);

    } catch (refreshError) {
      processQueue(refreshError, null);

      // Refresh failed — clear session and redirect to login
      localStorage.removeItem('accessToken');
      localStorage.removeItem('lc-mode');

      // Only redirect if not already on auth pages
      const onAuthPage = ['/login', '/register', '/verify-email'].some(
        (p) => window.location.pathname.startsWith(p)
      );
      if (!onAuthPage) window.location.href = '/login';

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
