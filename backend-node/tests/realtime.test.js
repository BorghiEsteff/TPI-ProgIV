import { jest, describe, test, expect, beforeAll } from '@jest/globals';
import jwt from 'jsonwebtoken';
import aiService from '../src/services/aiService.js';
import { setupWatchRooms } from '../src/services/socketService.js';

describe('TP 3 - Tests de Microservicio IA y Tiempo Real (Socket.IO)', () => {
  const secretKey = 'test-secret-key-shared-with-django-12345';

  beforeAll(() => {
    process.env.JWT_SIGNING_KEY = secretKey;
  });

  // ── Pruebas de Cliente IA (FastAPI Review-Guard) ───────────────────────────
  test('1. IA: Clasifica reseña con spoiler correctamente cuando FastAPI responde', async () => {
    const mockAiResponse = {
      data: {
        contains_spoiler: true,
        confidence: 0.94,
        sentiment: 'POSITIVE',
      },
    };

    jest.spyOn(aiService.aiClient, 'post').mockResolvedValue(mockAiResponse);

    const result = await aiService.analyzeReviewForSpoilers('El villano muere al final', 1);

    expect(result.containsSpoiler).toBe(true);
    expect(result.confidence).toBe(0.94);
    expect(result.sentiment).toBe('POSITIVE');
    expect(result.degraded).toBe(false);
  });

  test('2. IA: Activa modo de contingencia resiliente si FastAPI agota timeout de 4s', async () => {
    jest.spyOn(aiService.aiClient, 'post').mockRejectedValue(new Error('timeout of 4000ms exceeded'));

    const result = await aiService.analyzeReviewForSpoilers('Buen capitulo', 1);

    expect(result.containsSpoiler).toBe(false);
    expect(result.degraded).toBe(true);
    expect(result.sentiment).toBe('UNKNOWN');
  });

  // ── Pruebas de WatchRooms (Socket.IO) ───────────────────────────────────────
  test('3. Socket.IO: Autentica conexión y gestiona presencia de usuario en WatchRoom', () => {
    const token = jwt.sign({ user_id: 'user-77', username: 'lucas_fan', role: 'USER' }, secretKey);

    // Mock minimalista de Socket.IO Server
    const registeredMiddlewares = [];
    const registeredEventHandlers = {};

    const mockIo = {
      use: (fn) => registeredMiddlewares.push(fn),
      on: (event, fn) => {
        registeredEventHandlers[event] = fn;
      },
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };

    const { roomsPresence } = setupWatchRooms(mockIo);
    expect(registeredMiddlewares).toHaveLength(1);

    // 1. Probar middleware de autenticación del socket
    const authMiddleware = registeredMiddlewares[0];
    const mockSocket = {
      id: 'socket-abc-123',
      handshake: { auth: { token } },
      join: jest.fn(),
      leave: jest.fn(),
      emit: jest.fn(),
      to: jest.fn().mockReturnThis(),
    };

    const nextFn = jest.fn();
    authMiddleware(mockSocket, nextFn);

    expect(nextFn).toHaveBeenCalledWith();
    expect(mockSocket.user.id).toBe('user-77');
    expect(mockSocket.user.username).toBe('lucas_fan');

    // 2. Probar conexión y unirse a sala
    const socketEvents = {};
    mockSocket.on = (event, fn) => {
      socketEvents[event] = fn;
    };

    const connectionHandler = registeredEventHandlers['connection'];
    connectionHandler(mockSocket);

    // Disparar evento 'join_watch_room'
    socketEvents['join_watch_room']({ roomId: 'media-room-10' });

    expect(mockSocket.join).toHaveBeenCalledWith('media-room-10');
    expect(mockSocket.emit).toHaveBeenCalledWith(
      'room_presence_sync',
      expect.objectContaining({
        roomId: 'media-room-10',
        participants: [expect.objectContaining({ id: 'user-77' })],
      })
    );

    expect(roomsPresence.has('media-room-10')).toBe(true);
    expect(roomsPresence.get('media-room-10').size).toBe(1);

    // Disparar desconexión y verificar limpieza de presencia
    socketEvents['disconnect']();
    expect(roomsPresence.has('media-room-10')).toBe(false);
  });
});
