import 'dotenv/config';
import http from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import connectDB from './config/db.js';
import { setupWatchRooms } from './services/socketService.js';

const PORT = process.env.PORT || 5000;

// Crear servidor HTTP compatible con Express y Socket.IO
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || '*',
    methods: ['GET', 'POST'],
  },
});

// Configurar salas y eventos en tiempo real
setupWatchRooms(io);

const start = async () => {
  await connectDB();
  server.listen(PORT, () => {
    console.log(`[SERVER] backend-node corriendo en http://localhost:${PORT}`);
    console.log(`[SOCKET.IO] Servidor WebSocket y WatchRooms activo`);
  });
};

start();

export { server, io };
