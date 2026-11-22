/**
 * Normaliza texto para filtrado en UI (NFKD, sin tildes, minúsculas, espacios compactos)
 * preservando la letra 'ñ' de forma simétrica con backend-django/catalog/search.py.
 */
export const normalizeSearchText = (value) => {
  if (!value) return '';
  const protectedText = String(value).replace(/ñ/g, '\uffff').replace(/Ñ/g, '\uffff');
  return protectedText
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\uffff/g, 'ñ')
    .toLowerCase()
    .replace(/\+/g, ' plus ')
    .replace(/[^\p{L}\p{N}\s_]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export const matchesSearchQuery = (haystack, query) => {
  const qNorm = normalizeSearchText(query);
  if (!qNorm) return true;
  const targetNorm = normalizeSearchText(haystack);
  if (!targetNorm) return false;
  if (targetNorm.includes(qNorm)) return true;
  const qCompact = qNorm.replace(/\s+/g, '');
  if (qCompact.length >= 4 && targetNorm.replace(/\s+/g, '').includes(qCompact)) {
    return true;
  }
  return false;
};
