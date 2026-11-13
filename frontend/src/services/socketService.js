import { io } from 'socket.io-client';
import { tokenStorage } from '../api/interceptors';

const SOCKET_URL = import.meta.env.VITE_NODE_SOCKET_URL || 'http://localhost:5000';

let socketInstance = null;

export const connectWatchRoomSocket = () => {
  if (socketInstance && socketInstance.connected) {
    return socketInstance;
  }

  const token = tokenStorage.getAccessToken();

  socketInstance = io(SOCKET_URL, {
    auth: token ? { token } : {},
    transports: ['websocket', 'polling'],
  });

  return socketInstance;
};

export const joinWatchRoom = (roomId) => {
  const socket = connectWatchRoomSocket();
  socket.emit('join_watch_room', { roomId: String(roomId) });
  return socket;
};

export const leaveWatchRoom = () => {
  if (!socketInstance) return;
  socketInstance.emit('leave_watch_room');
};

export const syncPlaybackState = ({ state, currentTime }) => {
  if (!socketInstance) return;
  socketInstance.emit('sync_playback_state', {
    state,
    currentTime: Number(currentTime) || 0,
  });
};

export const sendRoomMessage = (message) => {
  if (!socketInstance || !message?.trim()) return;
  socketInstance.emit('send_room_message', { message: message.trim() });
};

export const subscribeToEvent = (eventName, handler) => {
  const socket = connectWatchRoomSocket();
  socket.on(eventName, handler);
  return () => {
    socket.off(eventName, handler);
  };
};

export const disconnectWatchRoomSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};

