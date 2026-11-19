import { buildSchema } from 'graphql';
import djangoService from '../services/djangoService.js';

/**
 * Esquema GraphQL público de CineTrack (reenfocado).
 * Solo expone fichas editoriales públicas aprobadas; no expone notas privadas,
 * valoraciones personales ni respuestas sociales.
 */
export const graphqlSchema = buildSchema(`
  type PublicMediaDetails {
    id: Int!
    title: String
    mediaType: String
    synopsis: String
    releaseDate: String
    posterImage: String
  }

  type Query {
    publicMediaDetails(mediaItemId: Int!): PublicMediaDetails
  }
`);

export const graphqlRoot = {
  publicMediaDetails: async ({ mediaItemId }) => {
    const mediaCheck = await djangoService.validateMediaExists(mediaItemId);
    if (!mediaCheck.exists || !mediaCheck.data) {
      return null;
    }
    const mediaData = mediaCheck.data;
    return {
      id: mediaData.id ?? mediaItemId,
      title: mediaData.title || '',
      mediaType: mediaData.media_type || 'UNKNOWN',
      synopsis: mediaData.synopsis || '',
      releaseDate: mediaData.release_date || '',
      posterImage: mediaData.poster_image || '',
    };
  },
};
