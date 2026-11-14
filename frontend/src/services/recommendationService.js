import nodeClient from '../api/nodeClient';

export const askRecommendations = async (prompt) => {
  const response = await nodeClient.post('/recommendations', { prompt });
  return response.data;
};
