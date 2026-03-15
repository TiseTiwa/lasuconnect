import { createContext, useContext, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import useAuthStore from './useAuthStore';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const socketRef = useRef(null);
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    // Connect to Socket.IO server
    socketRef.current = io('/', {
      withCredentials: true,
      autoConnect: true,
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('🔌 Socket connected:', socket.id);
      // Tell the server which user this socket belongs to
      socket.emit('user:join', user._id);
    });

    socket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });

    // Cleanup on unmount or when user changes
    return () => {
      socket.disconnect();
    };
  }, [isAuthenticated, user?._id]);

  return (
    <SocketContext.Provider value={socketRef}>
      {children}
    </SocketContext.Provider>
  );
};

// Hook to access the socket instance from any component
export const useSocket = () => {
  const socketRef = useContext(SocketContext);
  return socketRef?.current || null;
};

export default SocketContext;
