import axios from 'axios';

const ACCESS_TOKEN_KEY = 'cinetrack_access_token';
const REFRESH_TOKEN_KEY = 'cinetrack_refresh_token';
const USER_KEY = 'cinetrack_user';

export const tokenStorage = {
  getAccessToken: () => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefreshToken: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  getUser: () => {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
  setTokens: ({ access, refresh }) => {
    if (access) localStorage.setItem(ACCESS_TOKEN_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  },
  setUser: (user) => {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  },
  clearSession: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

const extractErrorMessage = (data, fallbackMessage) => {
  if (!data) return fallbackMessage;
  if (typeof data === 'string') return data;
  if (data.error?.message) return data.error.message;
  if (data.detail) return data.detail;
  if (data.message) return data.message;

  // Manejo de errores por campo de Django REST Framework
  const firstKey = Object.keys(data)[0];
  if (firstKey && Array.isArray(data[firstKey])) {
    return `${firstKey}: ${data[firstKey][0]}`;
  }
  return fallbackMessage;
};

export const normalizeHttpError = (error) => {
  if (!error.response) {
    return {
      status: 0,
      message: error.code === 'ECONNABORTED'
        ? 'Tiempo de espera agotado al conectar con el servidor.'
        : 'No se pudo establecer conexion con el servidor.',
      details: null,
    };
  }

  const { status, data } = error.response;
  const fallbackByStatus = {
    400: 'Solicitud invalida. Verifique los datos ingresados.',
    401: 'Sesion expirada o credenciales invalidas.',
    403: 'No posee permisos para realizar esta accion.',
    404: 'El recurso solicitado no fue encontrado.',
    422: 'Error de validacion en los datos enviados.',
    500: 'Error interno en el servidor.',
  };

  return {
    status,
    message: extractErrorMessage(data, fallbackByStatus[status] || 'Error inesperado en la peticion.'),
    details: data?.error?.details || data || null,
  };
};

const notifySessionExpired = () => {
  tokenStorage.clearSession();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cinetrack:session-expired'));
  }
};

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

export const attachInterceptors = (client) => {
  client.interceptors.request.use(
    (config) => {
      const token = tokenStorage.getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(normalizeHttpError(error))
  );

  client.interceptors.response.use(
    (response) => {
      const headers = response.headers || {};
      const degradedMode = String(headers['x-degraded-mode'] || '').toLowerCase() === 'true';
      const degradedAI = String(headers['x-degraded-ai'] || '').toLowerCase() === 'true';
      response.isDegraded = degradedMode || degradedAI;
      return response;
    },
    async (error) => {
      const originalRequest = error.config;
      const status = error.response?.status;
      const requestUrl = originalRequest?.url || '';

      const isAuthEndpoint =
        requestUrl.includes('/auth/login/') ||
        requestUrl.includes('/auth/token/refresh/') ||
        requestUrl.includes('/auth/register/');

      if (status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
        const refresh = tokenStorage.getRefreshToken();
        if (!refresh) {
          notifySessionExpired();
          return Promise.reject(normalizeHttpError(error));
        }

        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((newToken) => {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return client(originalRequest);
            })
            .catch((err) => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const djangoBaseUrl =
            import.meta.env.VITE_DJANGO_API_URL || 'http://localhost:8000/api/v1';
          const refreshResponse = await axios.post(`${djangoBaseUrl}/auth/token/refresh/`, {
            refresh,
          });
          const newAccess = refreshResponse.data?.access;
          if (!newAccess) {
            throw new Error('Refresh response without access token');
          }
          tokenStorage.setTokens({ access: newAccess });
          processQueue(null, newAccess);
          originalRequest.headers.Authorization = `Bearer ${newAccess}`;
          return client(originalRequest);
        } catch (refreshError) {
          processQueue(normalizeHttpError(refreshError), null);
          notifySessionExpired();
          return Promise.reject(normalizeHttpError(refreshError));
        } finally {
          isRefreshing = false;
        }
      }

      return Promise.reject(normalizeHttpError(error));
    }
  );
};

