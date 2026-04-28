import React, { useState, useEffect } from 'react';
import * as yup from 'yup';
import { dmApi } from '../services/dmApi';
import { ApiError, ErrorCodes } from '../utils/ApiError';
import UserSearch from './UserSearch';
import './SendDirectMessage.css';

const MAX_MESSAGE_LENGTH = 500;
const MIN_MESSAGE_LENGTH = 1;

// Yup-valideringsschema
const directMessageSchema = yup.object().shape({
  recipientId: yup
    .string()
    .required('Mottagare är obligatoriskt.')
    .matches(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      'Ogiltigt användar-ID.'
    ),
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

function SendDirectMessage({ senderId, onMessageSent }) {
  const [recipientId, setRecipientId] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [touched, setTouched] = useState({});

  const handleUserSelect = (user) => {
    if (user) {
      setRecipientId(user.id);
      setSelectedUser(user);
      setError(null);
      setValidationErrors(prev => ({ ...prev, recipientId: null }));
    } else {
      setRecipientId('');
      setSelectedUser(null);
      setValidationErrors(prev => ({ ...prev, recipientId: 'Mottagare är obligatoriskt.' }));
    }
  };

  // Real-time validering för message
  useEffect(() => {
    if (touched.message && message.trim().length > 0) {
      directMessageSchema
        .validateAt('message', { message }, { abortEarly: false })
        .then(() => {
          setValidationErrors(prev => ({ ...prev, message: null }));
        })
        .catch((err) => {
          if (err.errors && err.errors.length > 0) {
            setValidationErrors(prev => ({ ...prev, message: err.errors[0] }));
          }
        });
    }
  }, [message, touched.message]);

  // Validera att avsändare och mottagare inte är samma
  useEffect(() => {
    if (touched.recipientId && recipientId && senderId) {
      if (recipientId.toLowerCase() === senderId.toLowerCase()) {
        setValidationErrors(prev => ({
          ...prev,
          recipientId: 'Du kan inte skicka meddelande till dig själv.'
        }));
      } else {
        setValidationErrors(prev => ({ ...prev, recipientId: null }));
      }
    }
  }, [recipientId, senderId, touched.recipientId]);

  const validateForm = async () => {
    setError(null);
    setValidationErrors({});

    try {
      await directMessageSchema.validate(
        {
          recipientId: recipientId.trim(),
          message: message.trim(),
        },
        { abortEarly: false }
      );

      // Ytterligare validering: avsändare och mottagare kan inte vara samma
      if (senderId && recipientId.trim().toLowerCase() === senderId.toLowerCase()) {
        setError('Du kan inte skicka meddelande till dig själv.');
        return false;
      }

      return true;
    } catch (err) {
      if (err.inner) {
        const errors = {};
        err.inner.forEach((error) => {
          errors[error.path] = error.message;
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

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      await dmApi.sendDirectMessage(recipientId.trim(), message.trim());

      setSuccess(true);
      setMessage('');
      setRecipientId('');
      setSelectedUser(null);
      setTouched({});
      setValidationErrors({});

      // Callback för att notifiera förälder-komponenten
      if (onMessageSent) {
        onMessageSent();
      }

      // Dölj success-meddelandet efter 3 sekunder
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
          case ErrorCodes.INVALID_RECIPIENT_ID:
            setError('Ogiltigt mottagar-ID.');
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
            setError(err.message || 'Ett fel uppstod vid skickande av meddelande');
        }
      } else {
        setError(err.message || 'Ett fel uppstod vid skickande av meddelande');
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
        setTouched(prev => ({ ...prev, message: true }));
      }
    }
  };

  const handleUserSearchBlur = () => {
    if (!touched.recipientId) {
      setTouched(prev => ({ ...prev, recipientId: true }));
    }
  };

  return (
    <div className="send-dm-container">
      <h2 className="send-dm-title">Skicka direktmeddelande</h2>
      
      {error && (
        <div className="send-dm-error" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="send-dm-success" role="alert">
          Meddelandet skickades framgångsrikt!
        </div>
      )}

      <form onSubmit={handleSubmit} className="send-dm-form" noValidate>
        <div className="send-dm-field">
          <label htmlFor="recipientId" className="send-dm-label">
            Mottagare <span className="required-asterisk">*</span>
          </label>
          <div onBlur={handleUserSearchBlur}>
            <UserSearch
              onUserSelect={handleUserSelect}
              placeholder="Sök efter användare..."
              excludeUserId={senderId}
            />
          </div>
          {validationErrors.recipientId && touched.recipientId && (
            <div className="field-error" role="alert">
              {validationErrors.recipientId}
            </div>
          )}
          {selectedUser && (
            <div className="selected-user-info">
              Vald användare: <strong>{selectedUser.username}</strong>
            </div>
          )}
        </div>

        <div className="send-dm-field">
          <label htmlFor="message" className="send-dm-label">
            Meddelande <span className="required-asterisk">*</span>
          </label>
          <textarea
            id="message"
            name="message"
            value={message}
            onChange={handleMessageChange}
            onBlur={() => setTouched(prev => ({ ...prev, message: true }))}
            placeholder="Skriv ditt meddelande här..."
            className={`send-dm-textarea ${
              validationErrors.message && touched.message ? 'input-error' : ''
            }`}
            rows="5"
            disabled={loading}
            required
          />
          <div className="send-dm-character-count">
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
          className="send-dm-button"
          disabled={loading || !senderId || !recipientId || !message.trim()}
        >
          {loading ? 'Skickar...' : 'Skicka meddelande'}
        </button>
      </form>
    </div>
  );
}

export default SendDirectMessage;
