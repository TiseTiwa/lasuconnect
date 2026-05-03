import { create } from 'zustand';
import api from '../services/api';

// ── Session key ───────────────────────────────────────────
// We store a lightweight "session exists" flag in sessionStorage (tab-scoped)
// AND the access token in localStorage (persists across tabs).
// On every fresh page load we ALWAYS re-verify with the server.
const SESSION_KEY = 'lc_session';

const useAuthStore = create((set, get) => ({
  user:            null,
  isAuthenticated: false,
  isLoading:       true,   // start true → ProtectedRoute shows spinner until checked
  error:           null,

  clearError: () => set({ error: null }),

  // ── Login ───────────────────────────────────────────────
  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/auth/login', credentials);
      const { user, accessToken } = res.data.data;

      if (accessToken) {
        localStorage.setItem('accessToken', accessToken);
        sessionStorage.setItem(SESSION_KEY, '1'); // mark session as intentional
      }

      set({ user, isAuthenticated: true, isLoading: false, error: null });
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed. Please try again.';
      set({ isLoading: false, error: message });
      return { success: false, error: message };
    }
  },

  // ── Register ────────────────────────────────────────────
  register: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/auth/register', data);
      set({ isLoading: false, error: null });
      return { success: true, data: res.data };
    } catch (err) {
      const message = err.response?.data?.message || 'Registration failed.';
      set({ isLoading: false, error: message });
      return { success: false, error: message };
    }
  },

  // ── Logout ──────────────────────────────────────────────
  logout: async () => {
    try {
      await api.post('/auth/logout'); // clears cookie server-side
    } catch (_) {}

    // Clear ALL local state
    localStorage.removeItem('accessToken');
    sessionStorage.removeItem(SESSION_KEY);

    set({ user: null, isAuthenticated: false, error: null, isLoading: false });
    window.location.href = '/login';
  },

  // ── Restore session on app load ─────────────────────────
  // Called once in App.jsx useEffect on mount.
  // Only restores if there is both a stored token AND the server confirms it.
  restoreSession: async () => {
    // Already logged in this render cycle (e.g. just returned from login page)
    if (get().user) {
      set({ isLoading: false });
      return;
    }

    const token = localStorage.getItem('accessToken');

    // No stored token — definitely not logged in
    if (!token) {
      set({ isLoading: false, isAuthenticated: false });
      return;
    }

    // Token exists — verify with server (interceptor will refresh if expired)
    try {
      const res = await api.get('/auth/me');
      sessionStorage.setItem(SESSION_KEY, '1');
      set({
        user:            res.data.data.user,
        isAuthenticated: true,
        isLoading:       false,
      });
    } catch (_) {
      // Server rejected even after refresh attempt — full clear
      localStorage.removeItem('accessToken');
      sessionStorage.removeItem(SESSION_KEY);
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  // ── Helpers ──────────────────────────────────────────────
  updateUser: (updates) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...updates } : null,
    })),

  setUser: (user) => set({ user, isAuthenticated: !!user }),
}));

export default useAuthStore;
