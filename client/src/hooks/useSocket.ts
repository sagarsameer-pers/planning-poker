import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Initialize socket connection
    const serverUrl = process.env.NODE_ENV === 'production' 
      ? 'https://planning-poker-2mjf.onrender.com' 
      : 'http://localhost:3001';
    
    socketRef.current = io(serverUrl);

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  return socketRef.current;
}; 