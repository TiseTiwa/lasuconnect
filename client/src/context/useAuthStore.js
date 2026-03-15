import { create } from "zustand";
import api from "../services/api";
import axios from 'axios';

// ─────────────────────────────────────────────────────────
//  useAuthStore — Zustand global store for authentication.
//  Manages: user object, accessToken, loading states.
//  Components use this instead of prop drilling or Context.
// ─────────────────────────────────────────────────────────
const useAuthStore = create((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  // ── Login ─────────────────────────────────────────────
  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.post("/auth/login", credentials);
      const { user, accessToken } = data.data;

      // Store access token in memory (and localStorage for page refresh)
      localStorage.setItem("accessToken", accessToken);

      set({ user, accessToken, isAuthenticated: true, isLoading: false });
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || "Login failed";
      set({ error: message, isLoading: false });
      return { success: false, message };
    }
  },

  // ── Register ──────────────────────────────────────────
  register: async (userData) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.post("/auth/register", userData);
      set({ isLoading: false });
      return { success: true, message: data.message };
    } catch (err) {
      const message = err.response?.data?.message || "Registration failed";
      set({ error: message, isLoading: false });
      return { success: false, message };
    }
  },

  // ── Logout ────────────────────────────────────────────
  logout: async () => {
    try {
      await api.post("/auth/logout");
    } catch (_) {
      // Ignore errors — clear state regardless
    }
    localStorage.removeItem("accessToken");
    set({ user: null, accessToken: null, isAuthenticated: false, error: null });
  },

  // ── Restore session on app load ───────────────────────
  restoreSession: async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      set({ isLoading: false });
      return;
    }
    set({ isLoading: true });
    try {
      // First try to refresh the token silently
      const refreshRes = await axios.post(
        "/api/auth/refresh-token",
        {},
        {
          withCredentials: true,
        },
      );
      const newToken = refreshRes.data.data.accessToken;
      localStorage.setItem("accessToken", newToken);

      const { data } = await api.get("/auth/me");
      set({
        user: data.data.user,
        accessToken: newToken,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (_) {
      localStorage.removeItem("accessToken");
      set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  // ── Update user in store after profile edit ───────────
  updateUser: (updates) => {
    set((state) => ({ user: { ...state.user, ...updates } }));
  },

  clearError: () => set({ error: null }),
}));

export default useAuthStore;
