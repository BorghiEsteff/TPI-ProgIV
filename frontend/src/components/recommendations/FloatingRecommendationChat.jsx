import { useEffect, useRef, useState } from 'react';
import { Alert, Badge, Button, Form, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import * as recommendationService from '../../services/recommendationService';
import * as trackingService from '../../services/trackingService';
import ClapperboardLauncher, { ClapperboardIcon } from './ClapperboardLauncher';
import './FloatingRecommendationChat.css';

const WELCOME_MESSAGE = {
  id: 'welcome',
  role: 'assistant',
  content:
    '¡Hola! Contame qué tipo de serie o película querés ver y te sugiero algo que esté en CineTrack.',
  recommendations: [],
  degraded: false,
};

const QUICK_CHIPS = ['Misterio', 'Romance', 'Algo corto', 'Películas'];
const MAX_PROMPT_CHARS = 300;
const MAX_HISTORY_MESSAGES = 6;

const FloatingRecommendationChat = () => {
  const { isAuthenticated, user } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [degraded, setDegraded] = useState(false);
  const [addedIds, setAddedIds] = useState(new Set());
  const [brokenPosters, setBrokenPosters] = useState(new Set());

  const launcherRef = useRef(null);
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const wasOpenRef = useRef(false);

  // Limpiar historial efimero y cerrar al cerrar sesion o cambiar usuario
  useEffect(() => {
    if (!isAuthenticated) {
      setIsOpen(false);
      setPrompt('');
      setMessages([WELCOME_MESSAGE]);
      setError(null);
      setDegraded(false);
      setAddedIds(new Set());
      setBrokenPosters(new Set());
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.id]);

  // Gestion de foco al abrir/cerrar y tecla Escape
  useEffect(() => {
    if (isOpen) {
      wasOpenRef.current = true;
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 20);
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          setIsOpen(false);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('keydown', handleKeyDown);
      };
    }

    if (wasOpenRef.current) {
      wasOpenRef.current = false;
      launcherRef.current?.focus();
    }
    return undefined;
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isOpen]);

  if (!isAuthenticated) {
    return null;
  }

  const buildHistoryPayload = (currentMessages) => {
    return currentMessages
      .filter((m) => m.id !== 'welcome' && (m.role === 'user' || m.role === 'assistant'))
      .slice(-MAX_HISTORY_MESSAGES)
      .map((m) => ({ role: m.role, content: m.content }));
  };

  const sendMessage = async (rawText) => {
    const cleanText = String(rawText || '').trim().slice(0, MAX_PROMPT_CHARS);
    if (!cleanText || isLoading) return;

    const history = buildHistoryPayload(messages);
    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: cleanText,
      recommendations: [],
    };

    setMessages((prev) => [...prev, userMsg]);
    setPrompt('');
    setError(null);
    setIsLoading(true);

    try {
      const data = await recommendationService.askRecommendations(cleanText, history);
      const isDegradedResp = Boolean(data?.degraded);
      setDegraded(isDegradedResp);

      const assistantMsg = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data?.message || 'No tengo coincidencias de ese tipo en el catálogo.',
        recommendations: Array.isArray(data?.recommendations) ? data.recommendations.slice(0, 3) : [],
        degraded: isDegradedResp,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      if (err?.status === 429) {
        setError('Demasiadas consultas seguidas. Espera unos segundos antes de volver a intentar.');
      } else if (err?.status === 503) {
        setError('El catálogo no está disponible en este momento. Intenta nuevamente en unos segundos.');
      } else {
        setError(err?.message || 'No se pudo obtener una recomendación en este momento.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(prompt);
  };

  const handleTextareaKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(prompt);
    }
  };

  const handleReset = () => {
    setMessages([WELCOME_MESSAGE]);
    setError(null);
    setDegraded(false);
    setPrompt('');
    inputRef.current?.focus();
  };

  const handleAddToDiary = async (mediaItemId) => {
    try {
      await trackingService.createTracking({
        media_item: mediaItemId,
        status: 'PENDIENTE',
      });
      setAddedIds((prev) => new Set(prev).add(mediaItemId));
    } catch (err) {
      setError(err?.message || 'No se pudo agregar a Mi CineTrack.');
    }
  };

  return (
    <div className="ct-floating-ai-root">
      {isOpen && (
        <section
          id="cinetrack-ai-panel"
          className="ct-ai-panel"
          role="region"
          aria-label="CineTrack IA Recomendaciones"
          data-testid="floating-ai-panel"
        >
          <header className="ct-ai-panel-header">
            <div className="ct-ai-panel-brand">
              <span className="ct-ai-panel-icon">
                <ClapperboardIcon animated={false} />
              </span>
              <h2 className="ct-ai-panel-title">CineTrack IA</h2>
            </div>
            <div className="ct-ai-panel-actions">
              <button
                type="button"
                className="ct-ai-header-btn"
                onClick={handleReset}
                aria-label="Reiniciar conversacion"
              >
                Reiniciar
              </button>
              <button
                type="button"
                className="ct-ai-header-btn"
                onClick={() => setIsOpen(false)}
                aria-label="Cerrar panel de recomendaciones"
              >
                Cerrar
              </button>
            </div>
          </header>

          {degraded && (
            <div className="px-3 py-1 bg-warning-subtle border-bottom small text-dark">
              Modo limitado: recomendaciones por coincidencias del catálogo.
            </div>
          )}

          <div className="ct-ai-messages" aria-live="polite">
            {messages.map((msg) => (
              <div key={msg.id} className="d-flex flex-column gap-2">
                <div className={`ct-ai-bubble ct-ai-bubble--${msg.role}`}>
                  {msg.content}
                </div>

                {msg.role === 'assistant' &&
                  msg.recommendations &&
                  msg.recommendations.length > 0 && (
                    <div className="d-flex flex-column gap-2">
                      {msg.recommendations.map((rec) => {
                        const isAdded = addedIds.has(rec.media_item_id);
                        const hasPoster =
                          rec.poster_image && !brokenPosters.has(rec.media_item_id);
                        return (
                          <div key={rec.media_item_id} className="ct-ai-rec-card">
                            {hasPoster ? (
                              <img
                                src={rec.poster_image}
                                alt={rec.title}
                                className="ct-ai-rec-thumb"
                                onError={() =>
                                  setBrokenPosters((prev) =>
                                    new Set(prev).add(rec.media_item_id)
                                  )
                                }
                              />
                            ) : (
                              <div className="ct-ai-rec-thumb-fallback">
                                {rec.media_type === 'SERIE' ? 'SERIE' : 'PELI'}
                              </div>
                            )}
                            <div className="flex-grow-1 min-w-0">
                              <div className="d-flex align-items-center justify-content-between gap-1 mb-1">
                                <strong className="small text-truncate">{rec.title}</strong>
                                <Badge
                                  bg=""
                                  className={
                                    rec.media_type === 'SERIE'
                                      ? 'ct-badge-serie'
                                      : 'ct-badge-pelicula'
                                  }
                                >
                                  {rec.media_type}
                                </Badge>
                              </div>
                              <p className="ct-ai-rec-reason">{rec.reason}</p>
                              <div className="ct-ai-rec-actions">
                                <Button
                                  as={Link}
                                  to={`/media/${rec.media_item_id}`}
                                  size="sm"
                                  variant="outline-secondary"
                                  onClick={() => setIsOpen(false)}
                                >
                                  Ver ficha
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={isAdded ? 'success' : 'primary'}
                                  disabled={isAdded}
                                  onClick={() => handleAddToDiary(rec.media_item_id)}
                                >
                                  {isAdded ? 'En Mi CineTrack' : 'Agregar'}
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
              </div>
            ))}

            {messages.length === 1 && !isLoading && (
              <div className="ct-ai-chips" aria-label="Sugerencias rapidas">
                {QUICK_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    className="ct-ai-chip"
                    disabled={isLoading}
                    onClick={() => sendMessage(chip)}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            )}

            {isLoading && (
              <div className="ct-ai-bubble ct-ai-bubble--assistant d-flex align-items-center gap-2">
                <Spinner animation="border" size="sm" role="status" />
                <span>Buscando en CineTrack...</span>
              </div>
            )}

            {error && (
              <Alert variant="danger" className="py-2 px-3 small mb-0">
                {error}
              </Alert>
            )}

            <div ref={messagesEndRef} />
          </div>

          <Form onSubmit={handleSubmit} className="ct-ai-form">
            <Form.Label htmlFor="ct-floating-ai-input" className="visually-hidden">
              Describe qué querés ver en CineTrack
            </Form.Label>
            <div className="ct-ai-input-row">
              <Form.Control
                ref={inputRef}
                id="ct-floating-ai-input"
                as="textarea"
                rows={1}
                maxLength={MAX_PROMPT_CHARS}
                className="ct-ai-textarea"
                placeholder="Ej. una serie de misterio..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleTextareaKeyDown}
                disabled={isLoading}
              />
              <Button
                type="submit"
                variant="primary"
                className="ct-ai-send-btn"
                disabled={isLoading || !prompt.trim()}
              >
                Enviar
              </Button>
            </div>
            <div className="ct-ai-meta-row">
              <span>Solo obras publicadas en CineTrack</span>
              <span>
                {prompt.length}/{MAX_PROMPT_CHARS}
              </span>
            </div>
          </Form>
        </section>
      )}

      <ClapperboardLauncher
        ref={launcherRef}
        isOpen={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
      />
    </div>
  );
};

export default FloatingRecommendationChat;
