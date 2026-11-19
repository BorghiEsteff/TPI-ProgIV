import nodeClient from '../api/nodeClient';

export const getNotesBatch = async (trackingIds = []) => {
  if (!trackingIds.length) return [];
  const response = await nodeClient.get('/personal-notes', {
    params: { tracking_ids: trackingIds.join(',') },
  });
  return response.data?.notes || [];
};

export const getNote = async (trackingEntryId) => {
  const response = await nodeClient.get(`/personal-notes/${trackingEntryId}`);
  return response.data?.note || null;
};

export const upsertNote = async (trackingEntryId, { rating, comment }) => {
  const response = await nodeClient.put(`/personal-notes/${trackingEntryId}`, {
    rating: rating === '' ? null : rating,
    comment: comment || '',
  });
  return response.data?.note;
};

export const deleteNote = async (trackingEntryId) => {
  await nodeClient.delete(`/personal-notes/${trackingEntryId}`);
};
