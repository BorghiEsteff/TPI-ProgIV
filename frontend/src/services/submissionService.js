import djangoClient from '../api/djangoClient';

export const createSubmission = async (payload) => {
  const isFormData = payload instanceof FormData;
  const response = await djangoClient.post('/submissions/', payload, {
    headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
  });
  return response.data;
};

export const getMySubmissions = async () => {
  const response = await djangoClient.get('/submissions/mine/');
  return Array.isArray(response.data) ? response.data : response.data?.results || [];
};

export const updateSubmission = async (id, payload) => {
  const isFormData = payload instanceof FormData;
  const response = await djangoClient.patch(`/submissions/${id}/`, payload, {
    headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
  });
  return response.data;
};

export const getAdminSubmissions = async (statusFilter = 'PENDING') => {
  const params = statusFilter ? { status: statusFilter } : {};
  const response = await djangoClient.get('/admin/submissions/', { params });
  return Array.isArray(response.data) ? response.data : response.data?.results || [];
};

export const getSubmissionCandidates = async (id) => {
  const response = await djangoClient.get(`/admin/submissions/${id}/candidates/`);
  return response.data?.candidates || [];
};

export const publishSubmission = async (id, payload = {}) => {
  const response = await djangoClient.post(`/admin/submissions/${id}/publish/`, payload);
  return response.data;
};

export const mergeSubmission = async (id, mediaItemId) => {
  const response = await djangoClient.post(`/admin/submissions/${id}/merge/`, {
    media_item_id: mediaItemId,
  });
  return response.data;
};

export const rejectSubmission = async (id, rejectionReason) => {
  const response = await djangoClient.post(`/admin/submissions/${id}/reject/`, {
    rejection_reason: rejectionReason,
  });
  return response.data;
};

export const updateCanonicalMedia = async (id, payload) => {
  const response = await djangoClient.patch(`/media/${id}/`, payload);
  return response.data;
};
