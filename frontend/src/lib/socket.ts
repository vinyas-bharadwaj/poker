import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    // Determine target URL for Socket.io
    const socketUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      (typeof window !== 'undefined'
        ? `${window.location.protocol}//${window.location.hostname}:5000`
        : 'http://localhost:5000');

    socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      withCredentials: true,
    });

    socket.on('connect', () => {
      console.log("♣️ Connected to Texas Hold'em Socket Server:", socket?.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('♦️ Disconnected from Socket Server:', reason);
    });

    socket.on('connect_error', (error) => {
      console.warn('♠️ Socket connection warning:', error.message);
    });
  }

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
