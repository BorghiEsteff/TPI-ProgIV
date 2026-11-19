import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import * as authService from '../services/authService';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => authService.getStoredToken());
  const [user, setUser] = useState(() => authService.getStoredUser());
  const [loadingAuth, setLoadingAuth] = useState(() => Boolean(authService.getStoredToken()));
  const [justLoggedOut, setJustLoggedOut] = useState(false);

  const clearAuthState = useCallback(() => {
    authService.logout();
    setToken(null);
    setUser(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    const profile = await authService.getProfile();
    setUser(profile);
    return profile;
  }, []);

  useEffect(() => {
    const handleSessionExpired = () => {
      setToken(null);
      setUser(null);
      setLoadingAuth(false);
    };

    window.addEventListener('cinetrack:session-expired', handleSessionExpired);
    return () => {
      window.removeEventListener('cinetrack:session-expired', handleSessionExpired);
    };
  }, []);

  useEffect(() => {
    let active = true;

    const hydrateSession = async () => {
      const storedToken = authService.getStoredToken();
      if (!storedToken) {
        if (active) setLoadingAuth(false);
        return;
      }

      try {
        const profile = await authService.getProfile();
        if (active) {
          setUser(profile);
          setToken(authService.getStoredToken());
        }
      } catch {
        if (active) {
          clearAuthState();
        }
      } finally {
        if (active) setLoadingAuth(false);
      }
    };

    hydrateSession();

    return () => {
      active = false;
    };
  }, [clearAuthState]);

  const login = useCallback(async (credentials) => {
    setJustLoggedOut(false);
    const data = await authService.login(credentials);
    setToken(data.access);
    setUser(data.user);
    return data;
  }, []);

  const register = useCallback(async (userData) => {
    return authService.register(userData);
  }, []);

  const logout = useCallback(() => {
    setJustLoggedOut(true);
    clearAuthState();
  }, [clearAuthState]);

  const role = user?.role ? String(user.role).toUpperCase() : null;
  const isAuthenticated = Boolean(token && user);

  const value = useMemo(
    () => ({
      user,
      role,
      token,
      isAuthenticated,
      loadingAuth,
      justLoggedOut,
      login,
      register,
      logout,
      refreshProfile,
    }),
    [user, role, token, isAuthenticated, loadingAuth, justLoggedOut, login, register, logout, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

