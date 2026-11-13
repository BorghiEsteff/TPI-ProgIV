import djangoClient from '../api/djangoClient';

export const getMyTracking = async (params = {}) => {
  const response = await djangoClient.get('/tracking/', { params });
  return {
    data: response.data,
    isDegraded: Boolean(response.isDegraded),
  };
};

export const createTracking = async (payload) => {
  const response = await djangoClient.post('/tracking/', payload);
  return response.data;
};

export const updateTrackingSeconds = async (id, payload) => {
  const response = await djangoClient.patch(`/tracking/${id}/`, payload);
  return response.data;
};

export const deleteTracking = async (id) => {
  const response = await djangoClient.delete(`/tracking/${id}/`);
  return response.data;
};

