import { jest, describe, test, expect } from '@jest/globals';
import { graphql } from 'graphql';
import mongoose from 'mongoose';
import { graphqlSchema, graphqlRoot } from '../src/graphql/schema.js';
import Review from '../src/models/Review.js';
import djangoService from '../src/services/djangoService.js';

describe('TP 4 - Tests de la Capa GraphQL Federada', () => {
  test('1. Consulta reviewsByMedia retorna el listado de reseñas con formato GraphQL', async () => {
    const mockReviews = [
      {
        _id: new mongoose.Types.ObjectId(),
        mediaItemId: 1,
        userId: 'user-01',
        userName: 'Ari',
        rating: 9,
        comment: 'Increíble primera temporada',
        isSpoiler: false,
        replies: [],
        createdAt: new Date(),
      },
    ];

    const sortMock = jest.fn().mockReturnThis();
    const leanMock = jest.fn().mockResolvedValue(mockReviews);
    jest.spyOn(Review, 'find').mockReturnValue({
      sort: sortMock.mockReturnValue({
        lean: leanMock,
      }),
    });

    const query = `
      query {
        reviewsByMedia(mediaItemId: 1) {
          id
          rating
          comment
          userName
        }
      }
    `;

    const res = await graphql({
      schema: graphqlSchema,
      source: query,
      rootValue: graphqlRoot,
    });

    expect(res.errors).toBeUndefined();
    expect(res.data.reviewsByMedia).toHaveLength(1);
    expect(res.data.reviewsByMedia[0].rating).toBe(9);
    expect(res.data.reviewsByMedia[0].comment).toBe('Increíble primera temporada');
  });

  test('2. Consulta mediaDetailsWithReviews combina datos de Django y MongoDB', async () => {
    jest.spyOn(djangoService, 'validateMediaExists').mockResolvedValue({
      exists: true,
      data: {
        id: 1,
        title: 'Stranger Things',
        media_type: 'SERIE',
        synopsis: 'Misterio en Hawkins',
        release_date: '2016-07-15',
      },
    });

    const mockReviews = [
      {
        _id: new mongoose.Types.ObjectId(),
        mediaItemId: 1,
        userId: 'u1',
        userName: 'Test1',
        rating: 8,
        comment: 'Muy buena',
        isSpoiler: false,
        replies: [],
        createdAt: new Date(),
      },
      {
        _id: new mongoose.Types.ObjectId(),
        mediaItemId: 1,
        userId: 'u2',
        userName: 'Test2',
        rating: 10,
        comment: 'Obra maestra',
        isSpoiler: false,
        replies: [],
        createdAt: new Date(),
      },
    ];

    const sortMock = jest.fn().mockReturnThis();
    const leanMock = jest.fn().mockResolvedValue(mockReviews);
    jest.spyOn(Review, 'find').mockReturnValue({
      sort: sortMock.mockReturnValue({
        lean: leanMock,
      }),
    });

    const query = `
      query {
        mediaDetailsWithReviews(mediaItemId: 1) {
          id
          title
          mediaType
          totalReviews
          averageRating
        }
      }
    `;

    const res = await graphql({
      schema: graphqlSchema,
      source: query,
      rootValue: graphqlRoot,
    });

    expect(res.errors).toBeUndefined();
    expect(res.data.mediaDetailsWithReviews.title).toBe('Stranger Things');
    expect(res.data.mediaDetailsWithReviews.totalReviews).toBe(2);
    expect(res.data.mediaDetailsWithReviews.averageRating).toBe(9.0);
  });
});
