import jwt from 'jsonwebtoken';

/**
 * Middleware de Autenticación JWT (compatible con Django SimpleJWT).
 *
 * Extrae y valida criptográficamente el Bearer token provisto en el header Authorization.
 * Configuración:
 * - JWT_SIGNING_KEY: Clave simétrica secreta compartida con Django.
 * - Algoritmo: HS256 (default SimpleJWT).
 *
 * Adjunta el usuario decodificado a req.user:
 * { id, username, email, role }
 */
export const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: {
        message: 'Acceso no autorizado: Token Bearer no proporcionado o formato inválido',
        code: 'UNAUTHORIZED',
        details: null,
      },
    });
  }

  const token = authHeader.split(' ')[1];
  const secretKey = process.env.JWT_SIGNING_KEY;

  if (!secretKey) {
    console.error('[SECURITY FATAL] JWT_SIGNING_KEY no está configurada en las variables de entorno');
    return res.status(500).json({
      error: {
        message: 'Error de configuración de seguridad en el servidor',
        code: 'SECURITY_CONFIG_ERROR',
        details: null,
      },
    });
  }

  try {
    const decoded = jwt.verify(token, secretKey, { algorithms: ['HS256'] });

    // Mapeo seguro del payload emitido por SimpleJWT
    // SimpleJWT suele emitir user_id en el payload.
    req.user = {
      id: decoded.user_id ? String(decoded.user_id) : String(decoded.id || decoded.sub),
      username: decoded.username || '',
      email: decoded.email || '',
      role: (decoded.role || 'USER').toUpperCase(),
    };

    next();
  } catch (err) {
    let message = 'Token inválido';
    let code = 'INVALID_TOKEN';

    if (err.name === 'TokenExpiredError') {
      message = 'El token ha expirado. Por favor solicite una renovación';
      code = 'TOKEN_EXPIRED';
    } else if (err.name === 'JsonWebTokenError') {
      message = `Firma o estructura de token inválida: ${err.message}`;
      code = 'MALFORMED_OR_INVALID_SIGNATURE';
    }

    return res.status(401).json({
      error: {
        message,
        code,
        details: null,
      },
    });
  }
};

/**
 * Middleware para autorización basada en roles (RBAC).
 *
 * @param  {...string} allowedRoles - Roles autorizados (ej: 'ADMIN', 'CRITIC')
 */
export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          message: 'Usuario no autenticado',
          code: 'UNAUTHORIZED',
          details: null,
        },
      });
    }

    const upperRoles = allowedRoles.map((r) => r.toUpperCase());
    if (!upperRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: {
          message: `Acceso denegado: El rol '${req.user.role}' no cuenta con los permisos necesarios`,
          code: 'FORBIDDEN_ROLE',
          details: { requiredRoles: upperRoles, currentRole: req.user.role },
        },
      });
    }

    next();
  };
};
