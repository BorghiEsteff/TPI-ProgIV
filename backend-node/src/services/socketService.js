import jwt from 'jsonwebtoken';

/**
 * WatchRooms deshabilitado del alcance de producto (Sección 2 y 9.7).
 * Se exige JWT válido en handshake y no se habilitan salas públicas ni chat social.
 */
export const setupWatchRooms = (io) => {
  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '');

    const secretKey = process.env.JWT_SIGNING_KEY;

    if (!token || !secretKey) {
      return next(new Error('Authentication error: WatchRooms deshabilitado o token faltante'));
    }

    try {
      const decoded = jwt.verify(token, secretKey, { algorithms: ['HS256'] });
      socket.user = {
        id: decoded.user_id ? String(decoded.user_id) : String(decoded.id || decoded.sub),
        username: decoded.username || 'Usuario CineTrack',
        role: (decoded.role || 'USER').toUpperCase(),
      };
      next();
    } catch (_err) {
      return next(new Error('Authentication error: Token inválido o expirado'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('join_watch_room', () => {
      socket.emit('watch_room_disabled', {
        code: 'FEATURE_DISABLED',
        message: 'WatchRooms fue deshabilitado en esta versión de CineTrack.',
      });
    });
  });
};
