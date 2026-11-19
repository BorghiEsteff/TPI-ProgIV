import nodeClient from '../api/nodeClient';

const NODE_GRAPHQL_URL =
  import.meta.env.VITE_NODE_GRAPHQL_URL || 'http://localhost:5000/graphql';

export const getReviewsByMedia = async (mediaId, { page = 1, limit = 10 } = {}) => {
  const response = await nodeClient.get(`/reviews/media/${mediaId}`, {
    params: { page, limit },
  });
  return {
    data: response.data,
    isDegraded: Boolean(response.isDegraded),
  };
};

export const createReview = async (payload) => {
  const response = await nodeClient.post('/reviews/', payload);
  return {
    data: response.data,
    isDegraded: Boolean(response.isDegraded),
  };
};

export const updateReview = async (id, payload) => {
  const response = await nodeClient.put(`/reviews/${id}`, payload);
  return {
    data: response.data,
    isDegraded: Boolean(response.isDegraded),
  };
};

export const deleteReview = async (id) => {
  const response = await nodeClient.delete(`/reviews/${id}`);
  return response.data;
};

export const addReply = async (reviewId, comment) => {
  const response = await nodeClient.post(`/reviews/${reviewId}/replies`, { comment });
  return response.data;
};

export const getFederatedMediaDetails = async (mediaItemId) => {
  const query = `
    query MediaDetailsWithReviews($mediaItemId: Int!) {
      mediaDetailsWithReviews(mediaItemId: $mediaItemId) {
        id
        title
        mediaType
        synopsis
        releaseDate
        totalReviews
        averageRating
        reviews {
          id
          mediaItemId
          userId
          userName
          rating
          comment
          isSpoiler
          createdAt
          replies {
            userId
            userName
            comment
            createdAt
          }
        }
      }
    }
  `;

  const response = await nodeClient.post(NODE_GRAPHQL_URL, {
    query,
    variables: { mediaItemId: Number(mediaItemId) },
  });

  if (response.data?.errors?.length) {
    throw {
      status: 400,
      message: response.data.errors[0].message || 'Error en consulta GraphQL federada.',
      details: response.data.errors,
    };
  }

  return {
    data: response.data?.data?.mediaDetailsWithReviews || null,
    isDegraded: Boolean(response.isDegraded),
  };
};

