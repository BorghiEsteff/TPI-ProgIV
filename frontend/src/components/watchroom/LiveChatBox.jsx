import { useState } from 'react';
import { Badge, Button, Card, Col, Form, InputGroup, ListGroup, Row } from 'react-bootstrap';
import { formatDateTime } from '../../utils/timeFormat';

const LiveChatBox = ({
  isConnected = false,
  participants = [],
  messages = [],
  onSendMessage,
}) => {
  const [text, setText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim() || !onSendMessage) return;
    onSendMessage(text.trim());
    setText('');
  };

  return (
    <Row className="g-4">
      <Col lg={4}>
        <Card className="shadow-sm border-secondary-subtle h-100">
          <Card.Header className="d-flex justify-content-between align-items-center bg-white">
            <span className="fw-semibold">Participantes ({participants.length})</span>
            <Badge bg={isConnected ? 'success' : 'danger'}>
              {isConnected ? 'CONECTADO' : 'DESCONECTADO'}
            </Badge>
          </Card.Header>
          <ListGroup variant="flush">
            {participants.length === 0 ? (
              <ListGroup.Item className="text-muted small">
                Esperando participantes en la sala...
              </ListGroup.Item>
            ) : (
              participants.map((p, idx) => (
                <ListGroup.Item
                  key={p.id || idx}
                  className="d-flex justify-content-between align-items-center"
                >
                  <span className="small fw-semibold">{p.username || p.id}</span>
                  <Badge bg="secondary">{p.role || 'USER'}</Badge>
                </ListGroup.Item>
              ))
            )}
          </ListGroup>
        </Card>
      </Col>

      <Col lg={8}>
        <Card className="shadow-sm border-secondary-subtle h-100">
          <Card.Header className="bg-white fw-semibold">
            Chat en Vivo de la Sala
          </Card.Header>
          <Card.Body className="d-flex flex-column" style={{ minHeight: '300px' }}>
            <div
              className="flex-grow-1 overflow-auto mb-3 p-2 bg-light rounded border"
              style={{ maxHeight: '280px' }}
            >
              {messages.length === 0 ? (
                <p className="text-muted small mb-0 text-center py-4">
                  No hay mensajes en esta sala todavia.
                </p>
              ) : (
                messages.map((msg, idx) => (
                  <div key={`${msg.timestamp || idx}-${idx}`} className="mb-2">
                    <div className="d-flex justify-content-between align-items-center small">
                      <span className="fw-bold">
                        {msg.sender?.username || 'Participante'}
                      </span>
                      <span className="text-muted">{formatDateTime(msg.timestamp)}</span>
                    </div>
                    <div className="small">{msg.message}</div>
                  </div>
                ))
              )}
            </div>

            <Form onSubmit={handleSubmit}>
              <InputGroup>
                <Form.Control
                  type="text"
                  placeholder="Enviar un mensaje a la sala..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  disabled={!isConnected}
                  required
                />
                <Button type="submit" variant="primary" disabled={!isConnected}>
                  Enviar
                </Button>
              </InputGroup>
            </Form>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
};

export default LiveChatBox;

