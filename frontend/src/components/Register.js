import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../services/authApi';
import { useAuth } from '../contexts/AuthContext';
import { ApiError, ErrorCodes } from '../utils/ApiError';
import './Register.css';

function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const { login } = useAuth();
  const navigate = useNavigate();

  const validateForm = () => {
    const errors = {};
    setError(null);
    setValidationErrors({});

    if (!username.trim()) {
      errors.username = 'Username is required.';
    } else if (username.trim().length < 3) {
      errors.username = 'Username must be at least 3 characters.';
    }

    if (!email.trim()) {
      errors.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Invalid email address.';
    }

    if (!password) {
      errors.password = 'Password is required.';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters.';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9])/.test(password)) {
      errors.password = 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Password confirmation is required.';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setValidationErrors({});

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      const response = await authApi.register(
        username.trim(),
        email.trim(),
        password
      );
      
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
          case ErrorCodes.USER_ALREADY_EXISTS:
            setError('The username or email address is already registered.');
            break;
          case ErrorCodes.VALIDATION_ERROR:
            // Hantera valideringsfel från backend
            if (err.details && err.details.errors) {
              const backendErrors = {};
              err.details.errors.forEach((error) => {
                if (error.property === 'Username') {
                  backendErrors.username = error.message;
                } else if (error.property === 'Email') {
                  backendErrors.email = error.message;
                } else if (error.property === 'Password') {
                  backendErrors.password = error.message;
                }
              });
              if (Object.keys(backendErrors).length > 0) {
                setValidationErrors(backendErrors);
                setError('Please fix the errors above.');
              } else {
                setError('Validation error. Please check your input.');
              }
            } else {
              setError('Validation error. Please check your input.');
            }
            break;
          case ErrorCodes.NETWORK_ERROR:
            setError('Could not connect to the server. Check your internet connection.');
            break;
          case ErrorCodes.TIMEOUT_ERROR:
            setError('The request took too long. Please try again.');
            break;
          default:
            setError(err.message || 'Registration failed. Please try again.');
        }
      } else {
        setError(err.message || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <div className="register-badge">Create your Postra identity</div>
        <h2 className="register-title">Create account</h2>
        <p className="register-subtitle">
          Join Postra to build your identity, share with confidence, and create stronger
          connections in a cleaner social space.
        </p>

        <div className="register-highlights" aria-hidden="true">
          <span className="register-highlight-pill">Fast onboarding</span>
          <span className="register-highlight-pill">Clean profile feel</span>
          <span className="register-highlight-pill">Modern social app</span>
        </div>
        
        {error && (
          <div className="register-error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="register-form">
          <div className="register-field">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="At least 3 characters"
              className={`register-input ${validationErrors.username ? 'input-error' : ''}`}
              disabled={loading}
              autoComplete="username"
            />
            {validationErrors.username && (
              <span className="field-error">{validationErrors.username}</span>
            )}
          </div>

          <div className="register-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              className={`register-input ${validationErrors.email ? 'input-error' : ''}`}
              disabled={loading}
              autoComplete="email"
            />
            {validationErrors.email && (
              <span className="field-error">{validationErrors.email}</span>
            )}
          </div>

          <div className="register-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8+ chars, upper/lowercase, number, special character"
              className={`register-input ${validationErrors.password ? 'input-error' : ''}`}
              disabled={loading}
              autoComplete="new-password"
            />
            <div className="register-password-hint" aria-live="polite">
              Use at least 8 characters with an uppercase letter, lowercase letter, number, and special character.
            </div>
            {validationErrors.password && (
              <span className="field-error">{validationErrors.password}</span>
            )}
          </div>

          <div className="register-field">
            <label htmlFor="confirmPassword">Confirm password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat the password"
              className={`register-input ${validationErrors.confirmPassword ? 'input-error' : ''}`}
              disabled={loading}
              autoComplete="new-password"
            />
            {validationErrors.confirmPassword && (
              <span className="field-error">{validationErrors.confirmPassword}</span>
            )}
          </div>

          <button
            type="submit"
            className="register-button"
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <div className="register-footer">
          <p>
            Already have an account?{' '}
            <Link to="/login" className="register-link">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;
