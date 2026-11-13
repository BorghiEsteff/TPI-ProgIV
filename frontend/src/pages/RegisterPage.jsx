import { useState } from 'react';
import { Alert, Button, Card, Col, Container, Form, Row, Spinner } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import ErrorMessage from '../components/common/ErrorMessage';
import { useAuth } from '../hooks/useAuth';

const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    password_confirm: '',
    role: 'USER',
    bio: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    if (formData.password !== formData.password_confirm) {
      setFieldErrors({ password_confirm: ['Las contrasenas no coinciden.'] });
      return;
    }

    setSubmitting(true);
    try {
      await register({
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password,
        password_confirm: formData.password_confirm,
        role: formData.role,
        bio: formData.bio.trim(),
      });
      setSuccessMessage('Cuenta creada correctamente. Redirigiendo al inicio de sesion...');
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 1200);
    } catch (err) {
      setError(err);
      if (err?.details && typeof err.details === 'object') {
        setFieldErrors(err.details);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const renderFieldError = (field) => {
    const msg = fieldErrors[field];
    if (!msg) return null;
    return Array.isArray(msg) ? msg[0] : String(msg);
  };

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col md={7} lg={6}>
          <Card className="shadow-sm">
            <Card.Body className="p-4">
              <h2 className="h4 mb-3 text-center">Crear Cuenta en CineTrack</h2>
              <p className="text-muted small text-center mb-4">
                Complete sus datos para registrarse en la plataforma.
              </p>

              {successMessage && <Alert variant="success">{successMessage}</Alert>}
              <ErrorMessage error={error} />

              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3" controlId="registerUsername">
                  <Form.Label>Nombre de usuario</Form.Label>
                  <Form.Control
                    type="text"
                    name="username"
                    placeholder="ej. cinefilo_utn"
                    value={formData.username}
                    onChange={handleChange}
                    isInvalid={Boolean(renderFieldError('username'))}
                    disabled={submitting}
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    {renderFieldError('username')}
                  </Form.Control.Feedback>
                </Form.Group>

                <Form.Group className="mb-3" controlId="registerEmail">
                  <Form.Label>Correo electronico</Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    placeholder="usuario@cinetrack.com"
                    value={formData.email}
                    onChange={handleChange}
                    isInvalid={Boolean(renderFieldError('email'))}
                    disabled={submitting}
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    {renderFieldError('email')}
                  </Form.Control.Feedback>
                </Form.Group>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3" controlId="registerPassword">
                      <Form.Label>Contrasena</Form.Label>
                      <Form.Control
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        isInvalid={Boolean(renderFieldError('password'))}
                        disabled={submitting}
                        required
                      />
                      <Form.Control.Feedback type="invalid">
                        {renderFieldError('password')}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3" controlId="registerPasswordConfirm">
                      <Form.Label>Confirmar contrasena</Form.Label>
                      <Form.Control
                        type="password"
                        name="password_confirm"
                        value={formData.password_confirm}
                        onChange={handleChange}
                        isInvalid={Boolean(renderFieldError('password_confirm'))}
                        disabled={submitting}
                        required
                      />
                      <Form.Control.Feedback type="invalid">
                        {renderFieldError('password_confirm')}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3" controlId="registerRole">
                  <Form.Label>Perfil en la plataforma</Form.Label>
                  <Form.Select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    isInvalid={Boolean(renderFieldError('role'))}
                    disabled={submitting}
                  >
                    <option value="USER">USER - Espectador</option>
                    <option value="CRITIC">CRITIC - Critico</option>
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">
                    {renderFieldError('role')}
                  </Form.Control.Feedback>
                </Form.Group>

                <Form.Group className="mb-4" controlId="registerBio">
                  <Form.Label>Biografia (opcional)</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    name="bio"
                    placeholder="Breve descripcion de sus gustos cinematograficos"
                    value={formData.bio}
                    onChange={handleChange}
                    disabled={submitting}
                  />
                </Form.Group>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-100"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Spinner
                        as="span"
                        animation="border"
                        size="sm"
                        role="status"
                        aria-hidden="true"
                        className="me-2"
                      />
                      Registrando...
                    </>
                  ) : (
                    'Crear Cuenta'
                  )}
                </Button>
              </Form>

              <div className="text-center mt-3 small">
                Ya tiene una cuenta? <Link to="/login">Iniciar sesion</Link>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default RegisterPage;

