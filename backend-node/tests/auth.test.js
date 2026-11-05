import { jest, describe, test, expect, beforeAll } from '@jest/globals';
import jwt from 'jsonwebtoken';
import { authenticateJWT, authorizeRoles } from '../src/middlewares/authMiddleware.js';

describe('TP 2 - Tests de Seguridad y Autenticación JWT', () => {
  const secretKey = 'test-secret-key-shared-with-django-12345';

  beforeAll(() => {
    process.env.JWT_SIGNING_KEY = secretKey;
  });

  const generateToken = (payload, options = {}) => {
    return jwt.sign(payload, secretKey, { algorithm: 'HS256', expiresIn: '1h', ...options });
  };

  test('1. Permite acceso a ruta protegida con token JWT válido (SimpleJWT format)', () => {
    const token = generateToken({ user_id: 'user-123', username: 'ari_tester', role: 'USER' });

    const req = {
      headers: { authorization: `Bearer ${token}` },
    };
    const res = {};
    const next = jest.fn();

    authenticateJWT(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toBeDefined();
    expect(req.user.id).toBe('user-123');
    expect(req.user.username).toBe('ari_tester');
    expect(req.user.role).toBe('USER');
  });

  test('2. Rechaza acceso con 401 si no se envía encabezado de autorización', () => {
    const req = { headers: {} };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    authenticateJWT(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'UNAUTHORIZED' }),
      })
    );
  });

  test('3. Rechaza acceso con 401 ante token con firma criptográfica inválida', () => {
    const tokenWithOtherKey = jwt.sign({ user_id: 'hacker' }, 'wrong-secret-key');

    const req = {
      headers: { authorization: `Bearer ${tokenWithOtherKey}` },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    authenticateJWT(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'MALFORMED_OR_INVALID_SIGNATURE' }),
      })
    );
  });

  test('4. Rechaza acceso con 401 ante token expirado', () => {
    const expiredToken = generateToken({ user_id: 'user-old' }, { expiresIn: '-10s' });

    const req = {
      headers: { authorization: `Bearer ${expiredToken}` },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    authenticateJWT(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'TOKEN_EXPIRED' }),
      })
    );
  });

  test('5. RBAC: Permite acción cuando el usuario posee el rol autorizado (ADMIN)', () => {
    const req = { user: { id: 'admin-1', role: 'ADMIN' } };
    const res = {};
    const next = jest.fn();

    const middleware = authorizeRoles('ADMIN');
    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  test('6. RBAC: Rechaza con 403 cuando el rol no tiene permisos requeridos', () => {
    const req = { user: { id: 'user-1', role: 'USER' } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    const middleware = authorizeRoles('ADMIN', 'CRITIC');
    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'FORBIDDEN_ROLE' }),
      })
    );
  });
});
