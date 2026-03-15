import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import useAuthStore from "./context/useAuthStore";
import { SocketProvider } from "./context/SocketContext";
import ProtectedRoute from "./components/ProtectedRoute";
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
import SearchPage from "./pages/app/SearchPage"; // ← NEW
import NotFoundPage from "./pages/NotFoundPage";
import AnnouncementsPage from "./pages/app/AnnouncementsPage";
import PostDetailPage from './pages/app/PostDetailPage';

const App = () => {
  const { restoreSession } = useAuthStore();
  useEffect(() => {
    restoreSession();
  }, []);

  return (
    <SocketProvider>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />

        {/* Protected */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<FeedPage />} />
            <Route path="/reels" element={<ReelsPage />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/messages/:id" element={<MessagesPage />} />
            <Route path="/courses" element={<CoursesPage />} />
            <Route path="/live" element={<LivePage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/search" element={<SearchPage />} /> {/* ← NEW */}
            <Route path="/profile/:username" element={<ProfilePage />} />
            <Route path="/announcements" element={<AnnouncementsPage />} />
            <Route path="/post/:id" element={<PostDetailPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </SocketProvider>
  );
};

export default App;
