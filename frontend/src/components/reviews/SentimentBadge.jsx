import { Badge } from 'react-bootstrap';

const SENTIMENT_CONFIG = {
  POSITIVE: { bg: 'success', label: 'POSITIVO' },
  POSITIVO: { bg: 'success', label: 'POSITIVO' },
  NEUTRAL: { bg: 'secondary', label: 'NEUTRAL' },
  NEGATIVE: { bg: 'danger', label: 'NEGATIVO' },
  NEGATIVO: { bg: 'danger', label: 'NEGATIVO' },
  UNKNOWN: { bg: 'light', text: 'dark', label: 'SIN ANALISIS' },
};

const SentimentBadge = ({ sentiment }) => {
  if (!sentiment) return null;

  const key = String(sentiment).toUpperCase();
  const config = SENTIMENT_CONFIG[key] || { bg: 'info', text: 'dark', label: key };

  return (
    <Badge bg={config.bg} text={config.text} className={config.bg === 'light' ? 'border' : ''}>
      IA: {config.label}
    </Badge>
  );
};

export default SentimentBadge;

