import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../services/authApi';
import { useAuth } from '../contexts/AuthContext';
import { ApiError, ErrorCodes } from '../utils/ApiError';
import './Login.css';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password.trim()) {
      setError('Användarnamn och lösenord är obligatoriska.');
      return;
    }

    try {
      setLoading(true);
      const response = await authApi.login(username.trim(), password);
      
      // Spara autentiseringsdata i context
      login({
        token: response.token,
        userId: response.userId,
        username: response.username,
      });

      // Navigera till startsidan
      navigate('/');
    } catch (err) {
      if (err instanceof ApiError) {
        switch (err.errorCode) {
          case ErrorCodes.INVALID_CREDENTIALS:
            setError('Fel användarnamn eller lösenord.');
            break;
          case ErrorCodes.VALIDATION_ERROR:
            setError('Valideringsfel. Kontrollera dina indata.');
            break;
          case ErrorCodes.NETWORK_ERROR:
            setError('Kunde inte ansluta till servern. Kontrollera din internetanslutning.');
            break;
          case ErrorCodes.TIMEOUT_ERROR:
            setError('Begäran tog för lång tid. Försök igen.');
            break;
          default:
            setError(err.message || 'Inloggning misslyckades. Kontrollera dina uppgifter.');
        }
      } else {
        setError(err.message || 'Inloggning misslyckades. Kontrollera dina uppgifter.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2 className="login-title">Logga in</h2>
        
        {error && (
          <div className="login-error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <label htmlFor="username">Användarnamn</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ange ditt användarnamn"
              className="login-input"
              disabled={loading}
              autoComplete="username"
            />
          </div>

          <div className="login-field">
            <label htmlFor="password">Lösenord</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ange ditt lösenord"
              className="login-input"
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="login-button"
            disabled={loading || !username.trim() || !password.trim()}
          >
            {loading ? 'Loggar in...' : 'Logga in'}
          </button>
        </form>

        <div className="login-footer">
          <p>
            Har du inget konto?{' '}
            <a href="/register" className="login-link">
              Registrera dig här
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
