import nodeClient from '../api/nodeClient';

export const askRecommendations = async (prompt, history = []) => {
  const cleanHistory = Array.isArray(history)
    ? history
        .slice(-6)
        .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
        .map((m) => ({ role: m.role, content: m.content.trim().slice(0, 500) }))
    : [];

  const payload = cleanHistory.length > 0 ? { prompt, history: cleanHistory } : { prompt };
  const response = await nodeClient.post('/recommendations', payload, { timeout: 15000 });
  return response.data;
};
