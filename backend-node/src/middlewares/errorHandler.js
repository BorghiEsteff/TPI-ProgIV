/**
 * Middleware centralizado de manejo de errores.
 * Estandariza todas las respuestas de error en formato JSON:
 * { error: { message, code, details } }
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;

  const payload = {
    error: {
      message: err.message || 'Error interno del servidor',
      code:    err.code    || 'INTERNAL_ERROR',
      details: err.details || null,
    },
  };

  // En desarrollo, exponer el stack trace para facilitar la depuración.
  if (process.env.NODE_ENV === 'development' && err.stack) {
    payload.error.stack = err.stack;
  }

  res.status(statusCode).json(payload);
};

export default errorHandler;

