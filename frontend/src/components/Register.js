import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
      errors.username = 'Användarnamn är obligatoriskt.';
    } else if (username.trim().length < 3) {
      errors.username = 'Användarnamn måste vara minst 3 tecken.';
    }

    if (!email.trim()) {
      errors.email = 'E-post är obligatorisk.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Ogiltig e-postadress.';
    }

    if (!password) {
      errors.password = 'Lösenord är obligatoriskt.';
    } else if (password.length < 8) {
      errors.password = 'Lösenord måste vara minst 8 tecken.';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      errors.password = 'Lösenord måste innehålla minst en stor bokstav, en liten bokstav och en siffra.';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Bekräfta lösenord är obligatoriskt.';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Lösenorden matchar inte.';
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
            setError('Användarnamnet eller e-postadressen är redan registrerad.');
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
                setError('Korrigera felen ovan.');
              } else {
                setError('Valideringsfel. Kontrollera dina indata.');
              }
            } else {
              setError('Valideringsfel. Kontrollera dina indata.');
            }
            break;
          case ErrorCodes.NETWORK_ERROR:
            setError('Kunde inte ansluta till servern. Kontrollera din internetanslutning.');
            break;
          case ErrorCodes.TIMEOUT_ERROR:
            setError('Begäran tog för lång tid. Försök igen.');
            break;
          default:
            setError(err.message || 'Registrering misslyckades. Försök igen.');
        }
      } else {
        setError(err.message || 'Registrering misslyckades. Försök igen.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <h2 className="register-title">Registrera dig</h2>
        
        {error && (
          <div className="register-error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="register-form">
          <div className="register-field">
            <label htmlFor="username">Användarnamn</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Minst 3 tecken"
              className={`register-input ${validationErrors.username ? 'input-error' : ''}`}
              disabled={loading}
              autoComplete="username"
            />
            {validationErrors.username && (
              <span className="field-error">{validationErrors.username}</span>
            )}
          </div>

          <div className="register-field">
            <label htmlFor="email">E-post</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="exempel@email.com"
              className={`register-input ${validationErrors.email ? 'input-error' : ''}`}
              disabled={loading}
              autoComplete="email"
            />
            {validationErrors.email && (
              <span className="field-error">{validationErrors.email}</span>
            )}
          </div>

          <div className="register-field">
            <label htmlFor="password">Lösenord</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minst 8 tecken, stor/liten bokstav och siffra"
              className={`register-input ${validationErrors.password ? 'input-error' : ''}`}
              disabled={loading}
              autoComplete="new-password"
            />
            {validationErrors.password && (
              <span className="field-error">{validationErrors.password}</span>
            )}
          </div>

          <div className="register-field">
            <label htmlFor="confirmPassword">Bekräfta lösenord</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Upprepa lösenordet"
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
            {loading ? 'Registrerar...' : 'Registrera dig'}
          </button>
        </form>

        <div className="register-footer">
          <p>
            Har du redan ett konto?{' '}
            <a href="/login" className="register-link">
              Logga in här
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;
