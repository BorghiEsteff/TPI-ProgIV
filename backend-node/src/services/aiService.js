import axios from 'axios';

export const aiClient = axios.create({
  baseURL: process.env.AI_SERVICE_URL || 'http://localhost:8002/ai',
  timeout: parseInt(process.env.AI_TIMEOUT_MS, 10) || 6000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

const MAX_CANDIDATES_TO_AI = 30;
const MAX_RECOMMENDATIONS = 3;

const GENRE_ALIASES = {
  romance: ['romance', 'romantico', 'romantica', 'amor'],
  drama: ['drama', 'dramatico', 'dramatica'],
  terror: ['terror', 'horror', 'miedo'],
  'ciencia ficcion': ['ciencia ficcion', 'sci-fi', 'scifi', 'futurista'],
  accion: ['accion', 'pelea'],
  comedia: ['comedia', 'gracioso', 'graciosa', 'divertida', 'divertido', 'humor'],
  suspenso: ['suspenso', 'thriller', 'misterio'],
  animacion: ['animacion', 'anime', 'animada', 'animado'],
  fantasia: ['fantasia', 'magia', 'magico'],
};

const STOP_WORDS = new Set([
  'quiero', 'ver', 'algo', 'una', 'uno', 'unos', 'unas', 'para', 'hoy', 'noche',
  'por', 'favor', 'dame', 'busco', 'recomienda', 'recomendame', 'sugiere', 'sugerime',
  'que', 'tenga', 'con', 'sin', 'mas', 'menos', 'pero', 'sea', 'mejor', 'otra', 'otro',
  'parecido', 'parecida', 'similar', 'corta', 'corto', 'larga', 'largo', 'breve',
  'pelicula', 'peliculas', 'peli', 'film', 'cine', 'serie', 'series', 'temporada',
  'capitulo', 'kdrama', 'k-drama', 'dorama', 'del', 'las', 'los', 'este', 'esta', 'eso',
]);

const normalizeText = (text = '') =>
  String(text)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '');

const FOLLOWUP_HINTS = [
  'otra', 'otro', 'parecid', 'similar', 'mas ', 'menos ', 'pero', 'mejor',
  'corta', 'corto', 'larga', 'largo', 'divertid', 'y una', 'y un', 'algo asi',
  'del mismo', 'de ese', 'de esa',
];

const isFollowupPrompt = (prompt = '') => {
  const norm = normalizeText(prompt);
  return FOLLOWUP_HINTS.some((hint) => norm.includes(hint));
};

const extractCriteria = (prompt = '', history = []) => {
  const useHistory = Array.isArray(history) && history.length > 0 && isFollowupPrompt(prompt);
  const userTexts = [
    ...(useHistory ? history.slice(-6).filter((m) => m?.role === 'user').map((m) => m.content) : []),
    prompt,
  ];

  let targetYear = null;
  let targetType = null;
  let targetCountry = null;
  let genres = [];
  const tokenSet = new Set();

  for (const text of userTexts) {
    const norm = normalizeText(text);
    const yearMatch = norm.match(/\b(19\d{2}|20\d{2})\b/);
    if (yearMatch) targetYear = Number(yearMatch[1]);

    if (norm.includes('kdrama') || norm.includes('k-drama') || norm.includes('corean') || norm.includes('dorama')) {
      targetType = 'SERIE';
      if (norm.includes('kdrama') || norm.includes('k-drama') || norm.includes('corean')) {
        targetCountry = 'KR';
      }
    } else if (/\b(serie|series|temporada|capitulo)\b/.test(norm)) {
      targetType = 'SERIE';
    } else if (/\b(pelicula|peliculas|peli|film|cine)\b/.test(norm)) {
      targetType = 'PELICULA';
      if (!norm.includes('corean')) {
        targetCountry = null;
      }
    }

    const matchedGenres = Object.entries(GENRE_ALIASES)
      .filter(([, words]) => words.some((w) => new RegExp(`\\b${w}\\b`).test(norm)))
      .map(([canonical]) => canonical);
    if (matchedGenres.length > 0) {
      genres = matchedGenres;
    }

    norm
      .split(/\W+/)
      .filter((t) => t.length >= 3 && !STOP_WORDS.has(t))
      .forEach((t) => tokenSet.add(t));
  }

  return {
    targetYear,
    targetType,
    targetCountry,
    genres,
    tokens: Array.from(tokenSet),
  };
};

const formatCandidate = (item) => ({
  id: item.id,
  title: item.title,
  media_type: item.media_type,
  release_year:
    item.release_year || (item.release_date ? Number(String(item.release_date).slice(0, 4)) : null),
  duration_minutes: item.duration_minutes ?? null,
  genres: Array.isArray(item.genres)
    ? item.genres.map((g) => (typeof g === 'string' ? g : g.name)).filter(Boolean)
    : [],
  country_of_origin: item.country_of_origin || '',
  tags: Array.isArray(item.tags) ? item.tags : [],
  synopsis: item.synopsis || '',
});

export const preselectCandidates = (prompt, candidates = [], history = []) => {
  const formatted = candidates.filter((c) => c?.is_active !== false).map(formatCandidate);
  const criteria = extractCriteria(prompt, history);

  const scored = formatted
    .map((c) => {
      if (criteria.targetType && String(c.media_type).toUpperCase() !== criteria.targetType) {
        return { c, score: -1 };
      }
      if (criteria.targetYear && c.release_year !== criteria.targetYear) {
        return { c, score: -1 };
      }
      if (criteria.targetCountry) {
        const origin = normalizeText(c.country_of_origin);
        if (!['kr', 'corea', 'corea del sur', 'south korea', 'korea'].includes(origin)) {
          return { c, score: -1 };
        }
      }
      if (criteria.genres.length > 0) {
        const candGenres = new Set([...c.genres, ...c.tags].map(normalizeText));
        const candText = normalizeText(`${c.title} ${c.synopsis}`);
        const matchesAllGenres = criteria.genres.every(
          (g) => Array.from(candGenres).some((cg) => cg.includes(g)) || candText.includes(g)
        );
        if (!matchesAllGenres) {
          return { c, score: -1 };
        }
      }

      const hay = normalizeText(
        `${c.title} ${c.synopsis} ${c.genres.join(' ')} ${c.tags.join(' ')} ${c.country_of_origin}`
      );
      const tokenScore = criteria.tokens.reduce((acc, tok) => acc + (hay.includes(tok) ? 2 : 0), 0);
      const baseScore = 1 + tokenScore;
      return { c, score: baseScore };
    })
    .filter((entry) => entry.score >= 0)
    .sort((a, b) => b.score - a.score);

  const hasStructural =
    Boolean(criteria.targetType) ||
    Boolean(criteria.targetYear) ||
    Boolean(criteria.targetCountry) ||
    criteria.genres.length > 0;

  if (!hasStructural && criteria.tokens.length > 0) {
    const withMatches = scored.filter((entry) => entry.score > 1);
    if (withMatches.length === 0) {
      return [];
    }
    return withMatches.slice(0, MAX_CANDIDATES_TO_AI).map((entry) => entry.c);
  }

  return scored.slice(0, MAX_CANDIDATES_TO_AI).map((entry) => entry.c);
};

const localDeterministicFallback = (prompt, preselectedCandidates) => {
  if (!preselectedCandidates || preselectedCandidates.length === 0) {
    return {
      message: 'No tengo coincidencias de ese tipo en el catálogo. Prueba ampliar tus criterios.',
      recommendations: [],
      degraded: true,
    };
  }

  const top = preselectedCandidates.slice(0, MAX_RECOMMENDATIONS);
  return {
    message: `Encontré ${top.length} opción(es) en el catálogo (modo limitado).`,
    recommendations: top.map((c) => ({
      media_item_id: c.id,
      reason: `Coincide en el catálogo (${c.media_type === 'SERIE' ? 'Serie' : 'Película'}${c.release_year ? `, ${c.release_year}` : ''}).`,
    })),
    degraded: true,
  };
};

export const requestCatalogRecommendations = async (prompt, candidates, history = []) => {
  const preselected = preselectCandidates(prompt, candidates || [], history);

  if (preselected.length === 0) {
    return {
      message: 'No tengo coincidencias de ese tipo en el catálogo. Prueba ampliar tus criterios.',
      recommendations: [],
      degraded: false,
    };
  }

  try {
    const response = await aiClient.post('/recommend', {
      prompt,
      candidates: preselected,
      history: Array.isArray(history) ? history.slice(-6) : [],
    });
    return response.data;
  } catch (error) {
    console.warn(`[WARN] AI service unavailable for /recommend: ${error.message}`);
    return localDeterministicFallback(prompt, preselected);
  }
};

const aiService = {
  aiClient,
  preselectCandidates,
  requestCatalogRecommendations,
};

export default aiService;
