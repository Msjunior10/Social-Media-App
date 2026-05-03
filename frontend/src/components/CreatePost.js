import React, { useState, useEffect } from 'react';
import * as yup from 'yup';
import { postsApi } from '../services/postsApi';
import { ApiError, ErrorCodes } from '../utils/ApiError';
import './CreatePost.css';

const MAX_MESSAGE_LENGTH = 500;
const MIN_MESSAGE_LENGTH = 1;

const postSchema = yup.object().shape({
  message: yup
    .string()
    .required('Meddelande är obligatoriskt.')
    .trim()
    .min(MIN_MESSAGE_LENGTH, `Meddelande måste vara minst ${MIN_MESSAGE_LENGTH} tecken.`)
    .max(MAX_MESSAGE_LENGTH, `Meddelande får inte vara längre än ${MAX_MESSAGE_LENGTH} tecken.`)
    .test('not-empty', 'Meddelande får inte vara tomt eller bara innehålla mellanslag.', (value) => {
      return value && value.trim().length >= MIN_MESSAGE_LENGTH;
    }),
});

function CreatePost({ senderId, onPostCreated }) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [touched, setTouched] = useState({});

  useEffect(() => {
    if (touched.message && message.trim().length > 0) {
      postSchema
        .validateAt('message', { message }, { abortEarly: false })
        .then(() => {
          setValidationErrors((prev) => ({ ...prev, message: null }));
        })
        .catch((err) => {
          if (err.errors && err.errors.length > 0) {
            setValidationErrors((prev) => ({ ...prev, message: err.errors[0] }));
          }
        });
    }
  }, [message, touched.message]);

  const validateForm = async () => {
    setError(null);
    setValidationErrors({});

    try {
      await postSchema.validate({ message: message.trim() }, { abortEarly: false });
      return true;
    } catch (err) {
      if (err.inner) {
        const errors = {};
        err.inner.forEach((validationError) => {
          errors[validationError.path] = validationError.message;
        });
        setValidationErrors(errors);
        setError('Valideringsfel. Kontrollera dina indata.');
      } else {
        setError(err.message || 'Valideringsfel.');
      }
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!(await validateForm())) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      await postsApi.createPost(message.trim());

      setSuccess(true);
      setMessage('');
      setTouched({});

      if (onPostCreated) {
        onPostCreated();
      }

      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      if (err instanceof ApiError) {
        switch (err.errorCode) {
          case ErrorCodes.TOKEN_EXPIRED:
            setError('Din session har gått ut. Logga in igen.');
            break;
          case ErrorCodes.NETWORK_ERROR:
            setError('Kunde inte ansluta till servern. Kontrollera din internetanslutning.');
            break;
          case ErrorCodes.TIMEOUT_ERROR:
            setError('Begäran tog för lång tid. Försök igen.');
            break;
          case ErrorCodes.MESSAGE_TOO_LONG:
            setError('Meddelandet är för långt.');
            break;
          case ErrorCodes.MESSAGE_TOO_SHORT:
            setError('Meddelandet är för kort.');
            break;
          case ErrorCodes.VALIDATION_ERROR:
            setError('Valideringsfel. Kontrollera dina indata.');
            break;
          default:
            setError(err.message || 'Ett fel uppstod vid skapande av inlägg');
        }
      } else {
        setError(err.message || 'Ett fel uppstod vid skapande av inlägg');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMessageChange = (e) => {
    const newMessage = e.target.value;
    if (newMessage.length <= MAX_MESSAGE_LENGTH) {
      setMessage(newMessage);
      setError(null);
      if (!touched.message) {
        setTouched((prev) => ({ ...prev, message: true }));
      }
    }
  };

  return (
    <div className="create-post-container">
      <h2 className="create-post-title">Skapa nytt inlägg</h2>

      {error && (
        <div className="create-post-error" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="create-post-success" role="alert">
          Inlägget skapades framgångsrikt!
        </div>
      )}

      <form onSubmit={handleSubmit} className="create-post-form" noValidate>
        <div className="create-post-field">
          <label htmlFor="message" className="create-post-label">
            Meddelande <span className="required-asterisk">*</span>
          </label>
          <p className="create-post-helper-text">
            Inlägget publiceras offentligt och syns för alla användare i appen.
          </p>
          <textarea
            id="message"
            name="message"
            value={message}
            onChange={handleMessageChange}
            onBlur={() => setTouched((prev) => ({ ...prev, message: true }))}
            placeholder="Skriv ditt inlägg här..."
            className={`create-post-textarea ${
              validationErrors.message && touched.message ? 'input-error' : ''
            }`}
            rows="5"
            disabled={loading}
            required
          />
          <div className="create-post-character-count">
            <span className={message.length > MAX_MESSAGE_LENGTH ? 'character-count-error' : ''}>
              {message.length} / {MAX_MESSAGE_LENGTH} tecken
            </span>
          </div>
          {validationErrors.message && touched.message && (
            <div className="field-error" role="alert">
              {validationErrors.message}
            </div>
          )}
        </div>

        <button
          type="submit"
          className="create-post-button"
          disabled={loading || !senderId || !message.trim()}
        >
          {loading ? 'Skapar...' : 'Skapa inlägg'}
        </button>
      </form>
    </div>
  );
}

export default CreatePost;