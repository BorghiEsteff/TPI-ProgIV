import 'dotenv/config';
import http from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import connectDB from './config/db.js';
import { setupWatchRooms } from './services/socketService.js';

const PORT = process.env.PORT || 5000;

// Crear servidor HTTP compatible con Express y Socket.IO
const server = http.createServer(app);

const allowedSocketOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean)
  : ['http://localhost:5173', 'http://127.0.0.1:5173'];

const io = new Server(server, {
  cors: {
    origin: allowedSocketOrigins,
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
