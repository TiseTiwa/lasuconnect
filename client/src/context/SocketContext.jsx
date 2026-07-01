import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import useAuthStore from "./useAuthStore";

const SocketContext = createContext(null);

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const s = io(SOCKET_URL, {
      withCredentials: true,
      autoConnect: true,
    });

    s.on("connect", () => {
      console.log("🔌 Socket connected:", s.id);
      s.emit("user:join", user._id);
    });

    s.on("disconnect", () => {
      console.log("❌ Socket disconnected");
    });

    s.on("connect_error", (err) => {
      console.error("Socket connection error:", err.message);
    });

    setSocket(s);

    return () => {
      s.disconnect();
      setSocket(null);
    };
  }, [isAuthenticated, user?._id]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);

export default SocketContext;
