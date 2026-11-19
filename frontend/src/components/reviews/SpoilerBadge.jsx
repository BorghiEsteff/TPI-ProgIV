import { Badge } from 'react-bootstrap';

const SpoilerBadge = ({ hasSpoiler = false, confidence = null }) => {
  if (!hasSpoiler) return null;

  const pct =
    confidence !== null && confidence !== undefined
      ? ` (${Math.round(Number(confidence) * 100)}%)`
      : '';

  return (
    <Badge bg="danger" text="light">
      CONTENIDO SPOILER{pct}
    </Badge>
  );
};

export default SpoilerBadge;

