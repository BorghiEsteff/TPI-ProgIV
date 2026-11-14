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

export const linkTrackingToMedia = async (id, mediaItemId) => {
  const response = await djangoClient.post(`/tracking/${id}/link-media/`, {
    media_item_id: mediaItemId,
  });
  return response.data;
};

export const getReconciliations = async () => {
  const response = await djangoClient.get('/tracking/reconciliations/');
  return Array.isArray(response.data) ? response.data : response.data?.results || [];
};

export const reconcileTrackingEntry = async (id, resolution = 'keep_canonical') => {
  const response = await djangoClient.post(`/tracking/${id}/reconcile/`, {
    resolution,
  });
  return response.data;
};

