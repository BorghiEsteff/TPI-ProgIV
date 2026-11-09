import jwt from 'jsonwebtoken';

/**
 * Gestor de salas en tiempo real (WatchRooms) con Socket.IO 4.
 *
 * Características:
 * 1. Autenticación en handshake con JWT emitido por Django SimpleJWT.
 * 2. Registro de presencia de usuarios por contenido/sala (mediaId o roomId).
 * 3. Eventos de sincronización y chat en vivo entre espectadores.
 * 4. Limpieza automática de presencia al desconectarse.
 */
export const setupWatchRooms = (io) => {
  // Middleware de autenticación Socket.IO
  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '');

    const secretKey = process.env.JWT_SIGNING_KEY;

    if (!token) {
      // Modo invitado o fallback si no provee token
      socket.user = {
        id: `guest-${socket.id.substring(0, 5)}`,
        username: `Invitado_${socket.id.substring(0, 4)}`,
        role: 'GUEST',
      };
      return next();
    }

    try {
      const decoded = jwt.verify(token, secretKey, { algorithms: ['HS256'] });
      socket.user = {
        id: decoded.user_id ? String(decoded.user_id) : String(decoded.id || decoded.sub),
        username: decoded.username || 'Usuario CineTrack',
        role: (decoded.role || 'USER').toUpperCase(),
      };
      next();
    } catch (err) {
      return next(new Error('Authentication error: Token inválido o expirado'));
    }
  });

  // Almacén en memoria de participantes por sala: Map<roomId, Map<socketId, user>>
  const roomsPresence = new Map();

  io.on('connection', (socket) => {
    let currentRoomId = null;

    // Unirse a una sala de visualización compartida
    socket.on('join_watch_room', ({ roomId }) => {
      if (!roomId) return;

      currentRoomId = String(roomId);
      socket.join(currentRoomId);

      if (!roomsPresence.has(currentRoomId)) {
        roomsPresence.set(currentRoomId, new Map());
      }

      const roomUsers = roomsPresence.get(currentRoomId);
      roomUsers.set(socket.id, socket.user);

      // Notificar al usuario la lista de presentes actual
      const participants = Array.from(roomUsers.values());
      socket.emit('room_presence_sync', {
        roomId: currentRoomId,
        participants,
      });

      // Difundir a la sala que un nuevo usuario ingresó
      socket.to(currentRoomId).emit('user_joined_room', {
        user: socket.user,
        totalParticipants: roomUsers.size,
      });
    });

    // Evento de sincronización de reproducción (Play / Pause / Seek)
    socket.on('sync_playback_state', (data) => {
      if (!currentRoomId) return;

      socket.to(currentRoomId).emit('playback_state_updated', {
        sender: socket.user,
        state: data.state, // 'PLAYING', 'PAUSED', 'SEEKING'
        currentTime: data.currentTime,
        timestamp: Date.now(),
      });
    });

    // Mensajes de comentarios en vivo dentro de la sala
    socket.on('send_room_message', (data) => {
      if (!currentRoomId || !data.message) return;

      io.to(currentRoomId).emit('new_room_message', {
        sender: socket.user,
        message: data.message,
        timestamp: new Date().toISOString(),
      });
    });

    // Salir explícitamente de la sala
    socket.on('leave_watch_room', () => {
      if (!currentRoomId) return;
      handleLeaveRoom(socket, currentRoomId);
      currentRoomId = null;
    });

    // Desconexión natural del socket
    socket.on('disconnect', () => {
      if (currentRoomId) {
        handleLeaveRoom(socket, currentRoomId);
      }
    });
  });

  const handleLeaveRoom = (socket, roomId) => {
    socket.leave(roomId);
    const roomUsers = roomsPresence.get(roomId);
    if (roomUsers) {
      roomUsers.delete(socket.id);
      socket.to(roomId).emit('user_left_room', {
        user: socket.user,
        totalParticipants: roomUsers.size,
      });

      if (roomUsers.size === 0) {
        roomsPresence.delete(roomId);
      }
    }
  };

  return { roomsPresence };
};

export default setupWatchRooms;
