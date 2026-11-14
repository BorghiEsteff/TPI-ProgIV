import axios from 'axios';

export const aiClient = axios.create({
  baseURL: process.env.AI_SERVICE_URL || 'http://localhost:8002/ai',
  timeout: parseInt(process.env.AI_TIMEOUT_MS, 10) || 4000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

const normalizeText = (text = '') =>
  String(text)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '');

const localDeterministicFallback = (prompt, candidates) => {
  if (!candidates || candidates.length === 0) {
    return {
      message: 'No tengo coincidencias de ese tipo en el catálogo. Prueba ampliar tus criterios.',
      recommendations: [],
      degraded: true,
    };
  }

  const normPrompt = normalizeText(prompt);
  const yearMatch = normPrompt.match(/\b(19\d{2}|20\d{2})\b/);
  const targetYear = yearMatch ? Number(yearMatch[1]) : null;
  const wantsKdrama = normPrompt.includes('kdrama') || normPrompt.includes('k-drama');
  const wantsSerie = wantsKdrama || normPrompt.includes('serie');
  const wantsMovie = normPrompt.includes('pelicula') || normPrompt.includes('peli');

  const filtered = candidates.filter((c) => {
    if (wantsSerie && c.media_type !== 'SERIE') return false;
    if (wantsMovie && c.media_type !== 'PELICULA') return false;
    if (targetYear && c.release_year !== targetYear) return false;
    if (wantsKdrama && normalizeText(c.country_of_origin) !== 'kr') return false;
    return true;
  });

  if (filtered.length === 0) {
    return {
      message: 'No tengo coincidencias de ese tipo en el catálogo. Prueba ampliar tus criterios.',
      recommendations: [],
      degraded: true,
    };
  }

  const tokens = normPrompt.split(/\W+/).filter((t) => t.length >= 3);
  const scored = filtered
    .map((c) => {
      const hay = normalizeText(
        `${c.title} ${c.synopsis || ''} ${(c.genres || []).join(' ')} ${c.country_of_origin || ''}`
      );
      const score = tokens.reduce((acc, t) => acc + (hay.includes(t) ? 1 : 0), 0);
      return { c, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return {
    message: `Encontré ${scored.length} opción(es) en el catálogo (modo determinista).`,
    recommendations: scored.map(({ c }) => ({
      media_item_id: c.id,
      reason: `Coincide en el catálogo (${c.media_type === 'SERIE' ? 'Serie' : 'Película'}${c.release_year ? `, ${c.release_year}` : ''}).`,
    })),
    degraded: true,
  };
};

export const requestCatalogRecommendations = async (prompt, candidates) => {
  const formattedCandidates = (candidates || []).slice(0, 50).map((item) => ({
    id: item.id,
    title: item.title,
    media_type: item.media_type,
    release_year: item.release_year || (item.release_date ? Number(String(item.release_date).slice(0, 4)) : null),
    genres: Array.isArray(item.genres)
      ? item.genres.map((g) => (typeof g === 'string' ? g : g.name)).filter(Boolean)
      : [],
    country_of_origin: item.country_of_origin || '',
    tags: Array.isArray(item.tags) ? item.tags : [],
    synopsis: item.synopsis || '',
  }));

  try {
    const response = await aiClient.post('/recommend', {
      prompt,
      candidates: formattedCandidates,
    });
    return response.data;
  } catch (error) {
    console.warn(`[WARN] AI service unavailable for /recommend: ${error.message}`);
    return localDeterministicFallback(prompt, formattedCandidates);
  }
};

const aiService = {
  aiClient,
  requestCatalogRecommendations,
};

export default aiService;
