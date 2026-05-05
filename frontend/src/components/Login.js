import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
      setError('Username and password are required.');
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
            setError('Incorrect username or password.');
            break;
          case ErrorCodes.VALIDATION_ERROR:
            setError('Validation error. Please check your input.');
            break;
          case ErrorCodes.NETWORK_ERROR:
            setError('Could not connect to the server. Check your internet connection.');
            break;
          case ErrorCodes.TIMEOUT_ERROR:
            setError('The request took too long. Please try again.');
            break;
          default:
            setError(err.message || 'Login failed. Please check your details.');
        }
      } else {
        setError(err.message || 'Login failed. Please check your details.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-badge">Socially Access</div>
        <h2 className="login-title">Sign in</h2>
        <p className="login-subtitle">
          Welcome back to a more curated social feed with a stronger sense of identity,
          rhythm, and presence.
        </p>

        <div className="login-highlights" aria-hidden="true">
          <span className="login-highlight-pill">Premium feed</span>
          <span className="login-highlight-pill">Direct posting</span>
          <span className="login-highlight-pill">Clear profile</span>
        </div>
        
        {error && (
          <div className="login-error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="login-input"
              disabled={loading}
              autoComplete="username"
            />
          </div>

          <div className="login-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
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
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="login-footer">
          <p>
            Don&apos;t have an account?{' '}
            <Link to="/register" className="login-link">
              Create one here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
