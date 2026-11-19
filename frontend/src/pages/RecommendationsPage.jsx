import { useState } from 'react';
import { Container } from 'react-bootstrap';
import RecommendationChat from '../components/recommendations/RecommendationChat';
import * as recommendationService from '../services/recommendationService';
import * as trackingService from '../services/trackingService';

const RecommendationsPage = () => {
  const [loading, setLoading] = useState(false);

  const handleAsk = async (prompt) => {
    setLoading(true);
    try {
      return await recommendationService.askRecommendations(prompt);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToDiary = async (mediaItemId) => {
    await trackingService.createTracking({
      media_item: mediaItemId,
      status: 'PENDIENTE',
    });
  };

  return (
    <Container className="py-4" style={{ maxWidth: 960 }}>
      <h1 className="h3 mb-1">Recomendaciones por IA</h1>
      <p className="text-muted small mb-4">
        Describe qué tienes ganas de ver y te sugeriremos títulos disponibles en el catálogo aprobado.
      </p>
      <RecommendationChat onAsk={handleAsk} onAddToDiary={handleAddToDiary} loading={loading} />
    </Container>
  );
};

export default RecommendationsPage;
