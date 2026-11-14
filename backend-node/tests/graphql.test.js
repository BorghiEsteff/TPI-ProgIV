import { jest, describe, test, expect, afterEach } from '@jest/globals';
import { graphql } from 'graphql';
import { graphqlSchema, graphqlRoot } from '../src/graphql/schema.js';
import djangoService from '../src/services/djangoService.js';

describe('GraphQL Público Reenfocado (P1)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('1. publicMediaDetails retorna únicamente campos editoriales aprobados', async () => {
    jest.spyOn(djangoService, 'validateMediaExists').mockResolvedValue({
      exists: true,
      data: {
        id: 1,
        title: 'Stranger Things',
        media_type: 'SERIE',
        synopsis: 'Misterio en Hawkins',
        release_date: '2016-07-15',
        poster_image: 'https://example.com/st.jpg',
      },
    });

    const query = `
      query {
        publicMediaDetails(mediaItemId: 1) {
          id
          title
          mediaType
          synopsis
          releaseDate
          posterImage
        }
      }
    `;

    const res = await graphql({
      schema: graphqlSchema,
      source: query,
      rootValue: graphqlRoot,
    });

    expect(res.errors).toBeUndefined();
    expect(res.data.publicMediaDetails).toEqual({
      id: 1,
      title: 'Stranger Things',
      mediaType: 'SERIE',
      synopsis: 'Misterio en Hawkins',
      releaseDate: '2016-07-15',
      posterImage: 'https://example.com/st.jpg',
    });
  });

  test('2. Consultas sociales retiradas (reviewsByMedia / mediaDetailsWithReviews) son rechazadas', async () => {
    const query = `
      query {
        reviewsByMedia(mediaItemId: 1) {
          id
          rating
        }
      }
    `;

    const res = await graphql({
      schema: graphqlSchema,
      source: query,
      rootValue: graphqlRoot,
    });

    expect(res.errors).toBeDefined();
    expect(res.errors[0].message).toContain('Cannot query field "reviewsByMedia"');
  });

  test('3. publicMediaDetails retorna null si la obra no existe o está oculta', async () => {
    jest.spyOn(djangoService, 'validateMediaExists').mockResolvedValue({ exists: false });

    const query = `
      query {
        publicMediaDetails(mediaItemId: 999) {
          id
          title
        }
      }
    `;

    const res = await graphql({
      schema: graphqlSchema,
      source: query,
      rootValue: graphqlRoot,
    });

    expect(res.errors).toBeUndefined();
    expect(res.data.publicMediaDetails).toBeNull();
  });
});
