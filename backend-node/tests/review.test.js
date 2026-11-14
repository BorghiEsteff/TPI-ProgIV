import { describe, test, expect } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';

describe('Cierre de rutas sociales públicas /api/v1/reviews (P1 / ACC-20)', () => {
  test('GET /api/v1/reviews/media/1 retorna 410 Gone sin exponer reseñas', async () => {
    const res = await request(app).get('/api/v1/reviews/media/1');
    expect(res.status).toBe(410);
    expect(res.body.error.code).toBe('ENDPOINT_RETIRED');
  });

  test('POST /api/v1/reviews retorna 410 Gone', async () => {
    const res = await request(app).post('/api/v1/reviews').send({ mediaItemId: 1, rating: 5 });
    expect(res.status).toBe(410);
    expect(res.body.error.code).toBe('ENDPOINT_RETIRED');
  });
});
