import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import useAuthStore from "./context/useAuthStore";
import { SocketProvider } from "./context/SocketContext";
import { ThemeProvider } from "./context/ThemeContext";
import ProtectedRoute, { PublicRoute } from "./components/ProtectedRoute";
import AppLayout from "./components/AppLayout";

// Auth
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import VerifyEmailPage from "./pages/auth/VerifyEmailPage";

// App
import FeedPage from "./pages/app/FeedPage";
import ProfilePage from "./pages/app/ProfilePage";
import MessagesPage from "./pages/app/MessagesPage";
import ReelsPage from "./pages/app/ReelsPage";
import CoursesPage from "./pages/app/CoursesPage";
import NotificationsPage from "./pages/app/NotificationsPage";
import LivePage from "./pages/app/LivePage";
import SearchPage from "./pages/app/SearchPage";
import NotFoundPage from "./pages/NotFoundPage";
import AnnouncementsPage from "./pages/app/AnnouncementsPage";
import PostDetailPage from "./pages/app/PostDetailPage";
import AdminDashboard from "./pages/app/AdminDashboard";
import HandbookPage from "./pages/app/HandbookPage";

const App = () => {
  const { restoreSession } = useAuthStore();

  useEffect(() => {
    restoreSession();
  }, []);

  return (
    <ThemeProvider>
      <SocketProvider>
        <Routes>
          {/* Public — logged-in users get redirected to / */}
          <Route path="/login"        element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register"     element={<PublicRoute><RegisterPage /></PublicRoute>} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />

          {/* Protected — unauthenticated users get redirected to /login */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/"                  element={<FeedPage />} />
              <Route path="/reels"             element={<ReelsPage />} />
              <Route path="/messages"          element={<MessagesPage />} />
              <Route path="/messages/:id"      element={<MessagesPage />} />
              <Route path="/courses"           element={<CoursesPage />} />
              <Route path="/live"              element={<LivePage />} />
              <Route path="/notifications"     element={<NotificationsPage />} />
              <Route path="/search"            element={<SearchPage />} />
              <Route path="/profile/:username" element={<ProfilePage />} />
              <Route path="/announcements"     element={<AnnouncementsPage />} />
              <Route path="/post/:id"          element={<PostDetailPage />} />
              <Route path="/admin"             element={<AdminDashboard />} />
              <Route path="/handbook"          element={<HandbookPage />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </SocketProvider>
    </ThemeProvider>
  );
};

export default App;
