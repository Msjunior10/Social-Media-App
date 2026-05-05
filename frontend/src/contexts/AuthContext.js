import React, { createContext, useContext, useState, useEffect } from 'react';
import { notificationsRealtime } from '../services/notificationsRealtime';
import { AUTH_EXPIRED_EVENT, clearStoredAuth } from '../utils/apiClient';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [userId, setUserId] = useState(localStorage.getItem('userId') || null);
  const [username, setUsername] = useState(localStorage.getItem('username') || null);

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }, [token]);

  useEffect(() => {
    if (userId) {
      localStorage.setItem('userId', userId);
    } else {
      localStorage.removeItem('userId');
    }
  }, [userId]);

  useEffect(() => {
    if (username) {
      localStorage.setItem('username', username);
    } else {
      localStorage.removeItem('username');
    }
  }, [username]);

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
    localStorage.setItem('token', authData.token);
    localStorage.setItem('userId', authData.userId);
    localStorage.setItem('username', authData.username);
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
