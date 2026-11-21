/**
 * Normaliza texto para filtrado en UI (NFKD, sin tildes, minúsculas, espacios compactos)
 * preservando la letra 'ñ' de forma consistente.
 */
export const normalizeSearchText = (value) => {
  if (!value) return '';
  const protectedText = String(value).replace(/ñ/g, '\uffff').replace(/Ñ/g, '\uffff');
  return protectedText
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\uffff/g, 'ñ')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s+]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};
