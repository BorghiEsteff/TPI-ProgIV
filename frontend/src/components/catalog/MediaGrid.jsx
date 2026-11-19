import { Col, Row } from 'react-bootstrap';
import MediaCard from './MediaCard';

const MediaGrid = ({
  items = [],
  isAuthenticated = false,
  trackedMediaIds = new Set(),
  trackingLoadingId = null,
  onTrackMedia,
}) => {
  return (
    <Row className="g-4">
      {items.map((item) => (
        <Col key={item.id} xs={12} sm={6} lg={4} xl={3}>
          <MediaCard
            item={item}
            isAuthenticated={isAuthenticated}
            isTracked={trackedMediaIds.has(Number(item.id))}
            isTrackingLoading={Number(trackingLoadingId) === Number(item.id)}
            onTrackMedia={onTrackMedia}
          />
        </Col>
      ))}
    </Row>
  );
};

export default MediaGrid;

