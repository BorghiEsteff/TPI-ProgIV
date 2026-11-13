import { useCallback, useEffect, useState } from 'react';
import * as socketService from '../services/socketService';

export const useWatchRoom = (roomId) => {
  const [isConnected, setIsConnected] = useState(false);
  const [socketError, setSocketError] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [playbackState, setPlaybackState] = useState({
    isPlaying: false,
    currentTimeSeconds: 0,
    updatedBy: null,
    updatedAt: null,
  });

  useEffect(() => {
    if (!roomId) return undefined;

    const socket = socketService.connectWatchRoomSocket();
    setIsConnected(Boolean(socket.connected));
    setSocketError(null);

    const handleConnect = () => {
      setIsConnected(true);
      setSocketError(null);
      socketService.joinWatchRoom(roomId);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    const handleConnectError = (err) => {
      setIsConnected(false);
      setSocketError(err?.message || 'Error de conexion con la sala en tiempo real.');
    };

    const handlePresenceSync = (payload) => {
      setParticipants(Array.isArray(payload?.participants) ? payload.participants : []);
    };

    const handleUserJoined = (payload) => {
      const joinedUser = payload?.user;
      if (!joinedUser) return;
      setParticipants((prev) => {
        const exists = prev.some((u) => String(u.id) === String(joinedUser.id));
        return exists ? prev : [...prev, joinedUser];
      });
    };

    const handleUserLeft = (payload) => {
      const leftUser = payload?.user;
      if (!leftUser) return;
      setParticipants((prev) =>
        prev.filter((u) => String(u.id) !== String(leftUser.id))
      );
    };

    const handlePlaybackUpdated = (payload) => {
      const nextPlaying = payload?.state === 'PLAYING';
      setPlaybackState({
        isPlaying: nextPlaying,
        currentTimeSeconds: Math.max(0, Math.floor(Number(payload?.currentTime) || 0)),
        updatedBy: payload?.sender?.username || 'Participante',
        updatedAt: payload?.timestamp || Date.now(),
      });
    };

    const handleNewMessage = (payload) => {
      setMessages((prev) => [...prev, payload]);
    };

    const unsubConnect = socketService.subscribeToEvent('connect', handleConnect);
    const unsubDisconnect = socketService.subscribeToEvent('disconnect', handleDisconnect);
    const unsubError = socketService.subscribeToEvent('connect_error', handleConnectError);
    const unsubPresence = socketService.subscribeToEvent('room_presence_sync', handlePresenceSync);
    const unsubJoined = socketService.subscribeToEvent('user_joined_room', handleUserJoined);
    const unsubLeft = socketService.subscribeToEvent('user_left_room', handleUserLeft);
    const unsubPlayback = socketService.subscribeToEvent(
      'playback_state_updated',
      handlePlaybackUpdated
    );
    const unsubMessage = socketService.subscribeToEvent('new_room_message', handleNewMessage);

    if (socket.connected) {
      socketService.joinWatchRoom(roomId);
    }

    return () => {
      unsubConnect();
      unsubDisconnect();
      unsubError();
      unsubPresence();
      unsubJoined();
      unsubLeft();
      unsubPlayback();
      unsubMessage();
      socketService.leaveWatchRoom();
      socketService.disconnectWatchRoomSocket();
    };
  }, [roomId]);

  useEffect(() => {
    if (!playbackState.isPlaying) return undefined;

    const timer = setInterval(() => {
      setPlaybackState((prev) => ({
        ...prev,
        currentTimeSeconds: prev.currentTimeSeconds + 1,
      }));
    }, 1000);

    return () => clearInterval(timer);
  }, [playbackState.isPlaying]);

  const emitPlaybackSync = useCallback(
    (isPlaying, currentTimeSeconds, explicitState = null) => {
      const safeSeconds = Math.max(0, Math.floor(Number(currentTimeSeconds) || 0));
      const state = explicitState || (isPlaying ? 'PLAYING' : 'PAUSED');

      setPlaybackState((prev) => ({
        ...prev,
        isPlaying: Boolean(isPlaying),
        currentTimeSeconds: safeSeconds,
        updatedBy: 'Tu sesion',
        updatedAt: Date.now(),
      }));

      socketService.syncPlaybackState({
        state,
        currentTime: safeSeconds,
      });
    },
    []
  );

  const emitChatMessage = useCallback((text) => {
    if (!text?.trim()) return;
    socketService.sendRoomMessage(text);
  }, []);

  return {
    isConnected,
    socketError,
    participants,
    playbackState,
    messages,
    emitPlaybackSync,
    emitChatMessage,
  };
};

