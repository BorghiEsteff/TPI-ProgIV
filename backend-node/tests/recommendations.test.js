import { jest, describe, test, expect, afterEach } from '@jest/globals';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import app from '../src/app.js';
import djangoService from '../src/services/djangoService.js';
import aiService from '../src/services/aiService.js';

const SECRET = 'test-secret-key-node';
process.env.JWT_SIGNING_KEY = SECRET;

const makeToken = (userId) =>
  jwt.sign({ user_id: userId, username: `u${userId}`, role: 'USER' }, SECRET, { algorithm: 'HS256' });

describe('Recomendaciones IA (ACC-02, ACC-18, ACC-19)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('ACC-02: Visitante sin token recibe 401', async () => {
    const res = await request(app)
      .post('/api/v1/recommendations')
      .send({ prompt: 'quiero un kdrama romántico del 2026' });
    expect(res.status).toBe(401);
  });

  test('Usuario autenticado recibe recomendaciones enriquecidas con fichas reales', async () => {
    jest.spyOn(djangoService, 'fetchPublishedCatalogCandidates').mockResolvedValue({
      ok: true,
      candidates: [
        {
          id: 12,
          title: 'Amor en Seúl',
          media_type: 'SERIE',
          poster_image: 'https://cdn.example.com/kdrama.jpg',
          release_year: 2026,
          country_of_origin: 'KR',
          genres: [{ name: 'Romance' }],
        },
      ],
    });
    jest.spyOn(aiService, 'requestCatalogRecommendations').mockResolvedValue({
      message: 'Encontré una serie ideal:',
      recommendations: [{ media_item_id: 12, reason: 'Kdrama romántico 2026' }],
      degraded: false,
    });

    const res = await request(app)
      .post('/api/v1/recommendations')
      .set('Authorization', `Bearer ${makeToken(1)}`)
      .send({ prompt: 'quiero un kdrama romántico del 2026' });

    expect(res.status).toBe(200);
    expect(res.body.degraded).toBe(false);
    expect(res.body.recommendations).toHaveLength(1);
    expect(res.body.recommendations[0].title).toBe('Amor en Seúl');
  });
});
