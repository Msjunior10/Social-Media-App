import React, { createContext, useContext, useState, useEffect } from 'react';
import { notificationsRealtime } from '../services/notificationsRealtime';
import { AUTH_EXPIRED_EVENT, clearStoredAuth, getStoredAuth, setStoredAuth } from '../utils/apiClient';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const storedAuth = getStoredAuth();
  const [token, setToken] = useState(storedAuth.token);
  const [userId, setUserId] = useState(storedAuth.userId);
  const [username, setUsername] = useState(storedAuth.username);

  useEffect(() => {
    setStoredAuth({ token, userId, username });
  }, [token, userId, username]);

  useEffect(() => {
    if (token) {
      notificationsRealtime.connect();
    }
  }, [token]);

  useEffect(() => {
    const handleAuthExpired = () => {
      notificationsRealtime.disconnect();
      setToken(null);
      setUserId(null);
      setUsername(null);
    };

    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);

    return () => {
      window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    };
  }, []);

  const login = (authData) => {
    setStoredAuth(authData);
    setToken(authData.token);
    setUserId(authData.userId);
    setUsername(authData.username);
    notificationsRealtime.connect();
  };

  const logout = () => {
    notificationsRealtime.disconnect();
    setToken(null);
    setUserId(null);
    setUsername(null);
    clearStoredAuth();
  };

  const isAuthenticated = !!token;

  const value = {
    token,
    userId,
    username,
    login,
    logout,
    isAuthenticated,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
