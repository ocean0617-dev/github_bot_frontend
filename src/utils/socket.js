import { io } from 'socket.io-client';

// Vite uses import.meta.env instead of process.env
// Use window.location.origin for proxy to work, or explicit URL if provided
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

export const socket = io(SOCKET_URL, {
  transports: ['websocket', 'polling'],
  autoConnect: true,
  reconnection: true
});

export default socket;