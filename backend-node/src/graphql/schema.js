import { buildSchema } from 'graphql';
import Review from '../models/Review.js';
import djangoService from '../services/djangoService.js';

/**
 * Esquema GraphQL de CineTrack (TP 4).
 * Combina en una única consulta federada:
 * - Obras multimedia provistas por Django (PostgreSQL).
 * - Reseñas y árbol de comentarios provistos por Node.js (MongoDB).
 */
export const graphqlSchema = buildSchema(`
  type Reply {
    userId: String!
    userName: String!
    comment: String!
    createdAt: String!
  }

  type Review {
    id: ID!
    mediaItemId: Int!
    userId: String!
    userName: String!
    rating: Int!
    comment: String!
    isSpoiler: Boolean!
    replies: [Reply!]!
    createdAt: String!
  }

  type MediaWithReviews {
    id: Int!
    title: String
    mediaType: String
    synopsis: String
    releaseDate: String
    reviews: [Review!]!
    totalReviews: Int!
    averageRating: Float
  }

  type Query {
    reviewsByMedia(mediaItemId: Int!): [Review!]!
    mediaDetailsWithReviews(mediaItemId: Int!): MediaWithReviews
  }
`);

export const graphqlRoot = {
  // Resolver para listar reseñas por id de obra
  reviewsByMedia: async ({ mediaItemId }) => {
    const reviews = await Review.find({ mediaItemId }).sort({ createdAt: -1 }).lean();
    return reviews.map((r) => ({
      ...r,
      id: r._id.toString(),
      createdAt: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
      replies: (r.replies || []).map((rep) => ({
        ...rep,
        createdAt: rep.createdAt ? rep.createdAt.toISOString() : new Date().toISOString(),
      })),
    }));
  },

  // Resolver federado: Consulta catálogo Django + agrega reseñas MongoDB
  mediaDetailsWithReviews: async ({ mediaItemId }) => {
    const mediaCheck = await djangoService.validateMediaExists(mediaItemId);
    const mediaData = mediaCheck.data || {};

    const reviews = await Review.find({ mediaItemId }).sort({ createdAt: -1 }).lean();
    const formattedReviews = reviews.map((r) => ({
      ...r,
      id: r._id.toString(),
      createdAt: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
      replies: (r.replies || []).map((rep) => ({
        ...rep,
        createdAt: rep.createdAt ? rep.createdAt.toISOString() : new Date().toISOString(),
      })),
    }));

    const total = formattedReviews.length;
    const avg =
      total > 0
        ? formattedReviews.reduce((acc, curr) => acc + curr.rating, 0) / total
        : 0.0;

    return {
      id: mediaItemId,
      title: mediaData.title || `Obra #${mediaItemId}`,
      mediaType: mediaData.media_type || 'UNKNOWN',
      synopsis: mediaData.synopsis || '',
      releaseDate: mediaData.release_date || '',
      reviews: formattedReviews,
      totalReviews: total,
      averageRating: parseFloat(avg.toFixed(1)),
    };
  },
};
