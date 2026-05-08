import React, { useState, useEffect } from 'react';
import * as yup from 'yup';
import { dmApi } from '../services/dmApi';
import { ApiError, ErrorCodes } from '../utils/ApiError';
import UserSearch from './UserSearch';
import './SendDirectMessage.css';

const MAX_MESSAGE_LENGTH = 500;
const MIN_MESSAGE_LENGTH = 1;
const MAX_MEDIA_SIZE_BYTES = 25 * 1024 * 1024;
const ALLOWED_MEDIA_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/ogg',
];

// Yup validation schema
const directMessageSchema = yup.object().shape({
  recipientId: yup
    .string()
    .required('Recipient is required.')
    .matches(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      'Invalid user ID.'
    ),
  message: yup
    .string()
    .required('Message is required.')
    .trim()
    .min(MIN_MESSAGE_LENGTH, `Message must be at least ${MIN_MESSAGE_LENGTH} character.`)
    .max(MAX_MESSAGE_LENGTH, `Message cannot be longer than ${MAX_MESSAGE_LENGTH} characters.`)
    .test('not-empty', 'Message cannot be empty or contain only spaces.', (value) => {
      return value && value.trim().length >= MIN_MESSAGE_LENGTH;
    }),
});

function SendDirectMessage({ senderId, onMessageSent }) {
  const [recipientId, setRecipientId] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [message, setMessage] = useState('');
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [touched, setTouched] = useState({});

  useEffect(() => {
    if (!selectedMedia) {
      setMediaPreviewUrl('');
      return undefined;
    }

    const previewUrl = URL.createObjectURL(selectedMedia);
    setMediaPreviewUrl(previewUrl);

    return () => URL.revokeObjectURL(previewUrl);
  }, [selectedMedia]);

  const isVideoPreview = Boolean(selectedMedia?.type?.startsWith('video/'));

  const handleUserSelect = (user) => {
    if (user) {
      setRecipientId(user.id);
      setSelectedUser(user);
      setError(null);
      setValidationErrors(prev => ({ ...prev, recipientId: null }));
    } else {
      setRecipientId('');
      setSelectedUser(null);
      setValidationErrors(prev => ({ ...prev, recipientId: 'Recipient is required.' }));
    }
  };

  // Real-time validation for message
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

  // Validate that sender and recipient are not the same
  useEffect(() => {
    if (touched.recipientId && recipientId && senderId) {
      if (recipientId.toLowerCase() === senderId.toLowerCase()) {
        setValidationErrors(prev => ({
          ...prev,
          recipientId: 'You cannot send a message to yourself.'
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
      if (selectedMedia) {
        if (!ALLOWED_MEDIA_TYPES.includes(selectedMedia.type)) {
          setValidationErrors({ media: 'Only JPG, PNG, GIF, WEBP, MP4, WEBM, and OGG files are allowed.' });
          setError('Validation error. Please check your input.');
          return false;
        }

        if (selectedMedia.size > MAX_MEDIA_SIZE_BYTES) {
          setValidationErrors({ media: 'The media file cannot be larger than 25 MB.' });
          setError('Validation error. Please check your input.');
          return false;
        }
      }

      if (!message.trim() && !selectedMedia) {
        setValidationErrors({ message: 'The message must contain text or media.' });
        setError('Validation error. Please check your input.');
        return false;
      }

      await directMessageSchema.validate(
        {
          recipientId: recipientId.trim(),
          message: message.trim() || 'media',
        },
        { abortEarly: false }
      );

      // Additional validation: sender and recipient cannot be the same
      if (senderId && recipientId.trim().toLowerCase() === senderId.toLowerCase()) {
        setError('You cannot send a message to yourself.');
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
        setError('Validation error. Please check your input.');
      } else {
        setError(err.message || 'Validation error.');
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

      await dmApi.sendDirectMessage(recipientId.trim(), message.trim(), selectedMedia);

      setSuccess(true);
      setMessage('');
      setSelectedMedia(null);
      setRecipientId('');
      setSelectedUser(null);
      setTouched({});
      setValidationErrors({});

      // Callback to notify the parent component
      if (onMessageSent) {
        onMessageSent();
      }

      // Hide success message after 3 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      if (err instanceof ApiError) {
        switch (err.errorCode) {
          case ErrorCodes.TOKEN_EXPIRED:
            setError('Your session has expired. Please sign in again.');
            break;
          case ErrorCodes.NETWORK_ERROR:
            setError('Could not connect to the server. Check your internet connection.');
            break;
          case ErrorCodes.TIMEOUT_ERROR:
            setError('The request took too long. Please try again.');
            break;
          case ErrorCodes.INVALID_RECIPIENT_ID:
            setError('Invalid recipient ID.');
            break;
          case ErrorCodes.MESSAGE_TOO_LONG:
            setError('The message is too long.');
            break;
          case ErrorCodes.MESSAGE_TOO_SHORT:
            setError('The message is too short.');
            break;
          case ErrorCodes.VALIDATION_ERROR:
            setError('Validation error. Please check your input.');
            break;
          default:
            setError(err.message || 'An error occurred while sending the message');
        }
      } else {
        setError(err.message || 'An error occurred while sending the message');
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

  const handleMediaChange = (event) => {
    const file = event.target.files?.[0] || null;
    setValidationErrors((prev) => ({ ...prev, media: null, message: null }));

    if (!file) {
      setSelectedMedia(null);
      return;
    }

    if (!ALLOWED_MEDIA_TYPES.includes(file.type)) {
      setSelectedMedia(null);
      setValidationErrors((prev) => ({ ...prev, media: 'Only JPG, PNG, GIF, WEBP, MP4, WEBM, and OGG files are allowed.' }));
      return;
    }

    if (file.size > MAX_MEDIA_SIZE_BYTES) {
      setSelectedMedia(null);
      setValidationErrors((prev) => ({ ...prev, media: 'The media file cannot be larger than 25 MB.' }));
      return;
    }

    setSelectedMedia(file);
  };

  const handleRemoveMedia = () => {
    setSelectedMedia(null);
    setValidationErrors((prev) => ({ ...prev, media: null }));
  };

  const handleUserSearchBlur = () => {
    if (!touched.recipientId) {
      setTouched(prev => ({ ...prev, recipientId: true }));
    }
  };

  return (
    <div className="send-dm-container">
      <div className="send-dm-header">
        <span className="send-dm-badge">Compose</span>
        <h2 className="send-dm-title">Send direct message</h2>
        <p className="send-dm-subtitle">Choose a recipient and write a quick message in a clear, clean layout.</p>
      </div>
      
      {error && (
        <div className="send-dm-error" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="send-dm-success" role="alert">
          The message was sent successfully!
        </div>
      )}

      <form onSubmit={handleSubmit} className="send-dm-form" noValidate>
        <div className="send-dm-field">
          <label htmlFor="recipientId" className="send-dm-label">
            Recipient <span className="required-asterisk">*</span>
          </label>
          <div onBlur={handleUserSearchBlur}>
            <UserSearch
              onUserSelect={handleUserSelect}
              placeholder="Search for users..."
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
              Selected user: <strong>{selectedUser.username}</strong>
            </div>
          )}
        </div>

        <div className="send-dm-field">
          <label htmlFor="message" className="send-dm-label">
            Message or media <span className="required-asterisk">*</span>
          </label>
          <textarea
            id="message"
            name="message"
            value={message}
            onChange={handleMessageChange}
            onBlur={() => setTouched(prev => ({ ...prev, message: true }))}
            placeholder="Write your message here..."
            className={`send-dm-textarea ${
              validationErrors.message && touched.message ? 'input-error' : ''
            }`}
            rows="5"
            disabled={loading}
            required
          />
          <div className="send-dm-character-count">
            <span className={message.length > MAX_MESSAGE_LENGTH ? 'character-count-error' : ''}>
              {message.length} / {MAX_MESSAGE_LENGTH} characters
            </span>
          </div>
          {validationErrors.message && touched.message && (
            <div className="field-error" role="alert">
              {validationErrors.message}
            </div>
          )}
        </div>

        <div className="send-dm-field">
          <label htmlFor="dm-media" className="send-dm-label">Photo or video (optional)</label>
          <input
            id="dm-media"
            name="dm-media"
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/ogg"
            onChange={handleMediaChange}
            className="send-dm-file-input"
            disabled={loading}
          />

          {selectedMedia && (
            <div className="send-dm-media-preview">
              {mediaPreviewUrl && (isVideoPreview ? (
                <video src={mediaPreviewUrl} className="send-dm-preview-media" controls muted />
              ) : (
                <img src={mediaPreviewUrl} alt="Selected DM media preview" className="send-dm-preview-media" />
              ))}
              <div className="send-dm-media-meta">
                <span>{selectedMedia.name}</span>
                <button type="button" className="send-dm-remove-media" onClick={handleRemoveMedia} disabled={loading}>Remove file</button>
              </div>
            </div>
          )}

          {validationErrors.media && (
            <div className="field-error" role="alert">{validationErrors.media}</div>
          )}
        </div>

        <button
          type="submit"
          className="send-dm-button"
          disabled={loading || !senderId || !recipientId || (!message.trim() && !selectedMedia)}
        >
          {loading ? 'Sending...' : 'Send message'}
        </button>
      </form>
    </div>
  );
}

export default SendDirectMessage;
