import { ApiError, ErrorCodes } from './ApiError';

const API_TIMEOUT = 10000; // 10 sekunder
export const AUTH_EXPIRED_EVENT = 'postra:auth-expired';
const AUTH_STORAGE_KEYS = ['token', 'userId', 'username'];

const getStorageValue = (key) => {
  const sessionValue = sessionStorage.getItem(key);
  if (sessionValue) {
    return sessionValue;
  }

  const legacyLocalValue = localStorage.getItem(key);
  if (legacyLocalValue) {
    sessionStorage.setItem(key, legacyLocalValue);
    localStorage.removeItem(key);
    return legacyLocalValue;
  }

  return null;
};

export const getStoredAuth = () => ({
  token: getStorageValue('token'),
  userId: getStorageValue('userId'),
  username: getStorageValue('username'),
});

export const setStoredAuth = ({ token, userId, username }) => {
  const entries = { token, userId, username };

  AUTH_STORAGE_KEYS.forEach((key) => {
    const value = entries[key];
    if (value) {
      sessionStorage.setItem(key, value);
    } else {
      sessionStorage.removeItem(key);
    }

    localStorage.removeItem(key);
  });
};

export const clearStoredAuth = () => {
  AUTH_STORAGE_KEYS.forEach((key) => {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
  });
};

export const isTokenExpired = (token) => {
  if (!token) {
    return true;
  }

  try {
    const [, payloadBase64] = token.split('.');
    if (!payloadBase64) {
      return true;
    }

    const normalizedPayload = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
    const paddingLength = (4 - (normalizedPayload.length % 4)) % 4;
    const paddedPayload = normalizedPayload.padEnd(normalizedPayload.length + paddingLength, '=');
    const payloadJson = atob(paddedPayload);
    const payload = JSON.parse(payloadJson);

    if (!payload.exp) {
      return false;
    }

    return payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
};

const notifyAuthExpired = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
  }
};

// Utility function för att hämta token från localStorage
const getAuthToken = () => {
  return getStorageValue('token');
};

const createTimeoutPromise = (timeoutMs) => {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new ApiError(
      ErrorCodes.TIMEOUT_ERROR,
      'The request took too long. Check your internet connection.',
      null
    )), timeoutMs);
  });
};

// Helper function för att göra autentiserade API-anrop
export const authenticatedFetch = async (url, options = {}) => {
  const token = getAuthToken();
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  
  const headers = {
    ...options.headers,
  };

  if (!isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    // Lägg till timeout
    const fetchPromise = fetch(url, {
      ...options,
      headers,
    });

    const response = await Promise.race([
      fetchPromise,
      createTimeoutPromise(API_TIMEOUT)
    ]);

    // Hantera 401 Unauthorized
    if (response.status === 401) {
      clearStoredAuth();
      notifyAuthExpired();
      throw new ApiError(
        ErrorCodes.TOKEN_EXPIRED,
        'Your session has expired. Please sign in again.',
        401
      );
    }

    return response;
  } catch (error) {
    // Hantera nätverksfel
    if (error instanceof ApiError) {
      throw error;
    }
    
    // Nätverksfel (ingen anslutning, timeout, etc.)
    if (error.name === 'TypeError' || error.message.includes('fetch')) {
      throw new ApiError(
        ErrorCodes.NETWORK_ERROR,
        'Could not connect to the server. Check your internet connection.',
        null
      );
    }
    
    throw error;
  }
};

// Helper för att hantera API-svar
export const handleApiResponse = async (response) => {
  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      // Om vi inte kan parsa JSON, använd status text
      throw new ApiError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        `Server error: ${response.statusText}`,
        response.status
      );
    }

    // Standardiserad felstruktur från backend
    const errorCode = errorData.errorCode || ErrorCodes.INTERNAL_SERVER_ERROR;
    const message = errorData.message || errorData.error || 'An error occurred';
    
    throw new ApiError(errorCode, message, response.status, errorData.details);
  }

  // Hantera NoContent (204) - inget body att parsa
  if (response.status === 204) {
    return null;
  }

  // Kontrollera om response har content
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    return null;
  }

  // Försök parsa JSON, men hantera tom body gracefully
  const text = await response.text();
  if (!text || text.trim().length === 0) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    // Om JSON-parsing misslyckas, returnera null istället för att kasta fel
    return null;
  }
};