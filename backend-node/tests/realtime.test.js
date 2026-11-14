import { jest, describe, test, expect } from '@jest/globals';
import { setupWatchRooms } from '../src/services/socketService.js';

describe('Socket.IO WatchRooms deshabilitado para invitados (P1)', () => {
  test('Rechaza handshake Socket.IO sin JWT válido', () => {
    let authMiddleware = null;
    const mockIo = {
      use: jest.fn((fn) => {
        authMiddleware = fn;
      }),
      on: jest.fn(),
    };

    setupWatchRooms(mockIo);
    expect(typeof authMiddleware).toBe('function');

    const nextMock = jest.fn();
    authMiddleware({ handshake: { auth: {}, headers: {} } }, nextMock);

    expect(nextMock).toHaveBeenCalledTimes(1);
    const err = nextMock.mock.calls[0][0];
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toContain('Authentication error');
  });
});
