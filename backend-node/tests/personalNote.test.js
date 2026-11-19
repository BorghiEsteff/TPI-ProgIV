import { jest, describe, test, expect, afterEach } from '@jest/globals';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import app from '../src/app.js';
import PersonalNote from '../src/models/PersonalNote.js';
import djangoService from '../src/services/djangoService.js';

const SECRET = 'test-secret-key-node';
process.env.JWT_SIGNING_KEY = SECRET;

const makeToken = (userId, role = 'USER') =>
  jwt.sign({ user_id: userId, username: `u${userId}`, email: `u${userId}@test.local`, role }, SECRET, {
    algorithm: 'HS256',
  });

describe('PersonalNote API Privada (ACC-07, ACC-08, ACC-23)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('ACC-02: Sin token devuelve 401', async () => {
    const res = await request(app).get('/api/v1/personal-notes/10');
    expect(res.status).toBe(401);
  });

  test('ACC-07: Usuario A no puede leer ni editar nota de entrada perteneciente a B (404)', async () => {
    jest.spyOn(djangoService, 'verifyTrackingOwnership').mockResolvedValue({
      authorized: false,
      status: 404,
    });

    const tokenA = makeToken(1);
    const getRes = await request(app)
      .get('/api/v1/personal-notes/999')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(getRes.status).toBe(404);

    const putRes = await request(app)
      .put('/api/v1/personal-notes/999')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ rating: 5, comment: 'Intento ajeno' });
    expect(putRes.status).toBe(404);
  });

  test('ACC-08: Rechaza ratings inválidos (0, 6, 3.5, texto) con 422 y acepta 1..5 o null', async () => {
    const tokenA = makeToken(1);
    jest.spyOn(djangoService, 'verifyTrackingOwnership').mockResolvedValue({
      authorized: true,
      data: { id: 10 },
    });
    jest.spyOn(PersonalNote, 'findOneAndUpdate').mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        ownerUserId: '1',
        trackingEntryId: 10,
        rating: 5,
        comment: 'Excelente',
      }),
    });

    for (const badRating of [0, 6, -1, 3.5, '5']) {
      const bad = await request(app)
        .put('/api/v1/personal-notes/10')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ rating: badRating, comment: 'test' });
      expect(bad.status).toBe(422);
    }

    const ok = await request(app)
      .put('/api/v1/personal-notes/10')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ rating: 5, comment: 'Excelente' });
    expect(ok.status).toBe(200);
    expect(ok.body.note.rating).toBe(5);
  });

  test('ACC-23: Si Django está caído, operación privada falla cerrado con 503', async () => {
    jest.spyOn(djangoService, 'verifyTrackingOwnership').mockResolvedValue({
      authorized: false,
      unavailable: true,
      status: 503,
    });

    const tokenA = makeToken(1);
    const res = await request(app)
      .put('/api/v1/personal-notes/10')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ rating: 4, comment: 'No debería guardarse' });
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('AUTH_VERIFICATION_UNAVAILABLE');
  });

  test('GET /api/v1/personal-notes/?tracking_ids=10,20 devuelve solo notas propias en lote', async () => {
    const tokenA = makeToken(1);
    jest.spyOn(djangoService, 'fetchOwnedTrackingIds').mockResolvedValue({
      authorized: true,
      allowedIds: [10],
    });
    jest.spyOn(PersonalNote, 'find').mockReturnValue({
      lean: jest.fn().mockResolvedValue([
        { ownerUserId: '1', trackingEntryId: 10, rating: 5, comment: 'Mia' },
      ]),
    });

    const res = await request(app)
      .get('/api/v1/personal-notes/?tracking_ids=10,20')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(res.body.notes).toHaveLength(1);
    expect(res.body.notes[0].trackingEntryId).toBe(10);
  });
});
