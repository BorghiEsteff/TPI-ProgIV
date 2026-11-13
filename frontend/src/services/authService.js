import djangoClient from '../api/djangoClient';
import { tokenStorage } from '../api/interceptors';

export const login = async (credentials) => {
  const response = await djangoClient.post('/auth/login/', credentials);
  const { access, refresh, user } = response.data;
  tokenStorage.setTokens({ access, refresh });
  if (user) {
    tokenStorage.setUser(user);
  }
  return response.data;
};

export const register = async (payload) => {
  const response = await djangoClient.post('/auth/register/', payload);
  return response.data;
};

export const refreshToken = async () => {
  const refresh = tokenStorage.getRefreshToken();
  if (!refresh) {
    throw { status: 401, message: 'No existe refresh token disponible.', details: null };
  }
  const response = await djangoClient.post('/auth/token/refresh/', { refresh });
  const { access } = response.data;
  tokenStorage.setTokens({ access });
  return access;
};

export const getProfile = async () => {
  const response = await djangoClient.get('/auth/me/');
  tokenStorage.setUser(response.data);
  return response.data;
};

export const logout = () => {
  tokenStorage.clearSession();
};

export const getStoredToken = () => tokenStorage.getAccessToken();
export const getStoredUser = () => tokenStorage.getUser();
export const isAuthenticated = () => Boolean(tokenStorage.getAccessToken());

