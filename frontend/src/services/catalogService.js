import djangoClient from '../api/djangoClient';

const DJANGO_GRAPHQL_URL =
  import.meta.env.VITE_DJANGO_GRAPHQL_URL || 'http://localhost:8000/graphql/';

export const getMediaList = async (params = {}) => {
  const response = await djangoClient.get('/media/', { params });
  return {
    data: response.data,
    isDegraded: Boolean(response.isDegraded),
  };
};

export const getMediaDetail = async (id) => {
  const response = await djangoClient.get(`/media/${id}/`);
  return {
    data: response.data,
    isDegraded: Boolean(response.isDegraded),
  };
};

export const getGenres = async () => {
  const response = await djangoClient.get('/genres/');
  return response.data;
};

export const queryCatalogGraphQL = async (query, variables = {}) => {
  const response = await djangoClient.post(DJANGO_GRAPHQL_URL, {
    query,
    variables,
  });
  if (response.data?.errors?.length) {
    throw {
      status: 400,
      message: response.data.errors[0].message || 'Error en consulta GraphQL de catalogo.',
      details: response.data.errors,
    };
  }
  return {
    data: response.data?.data,
    isDegraded: Boolean(response.isDegraded),
  };
};

