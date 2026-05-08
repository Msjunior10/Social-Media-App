import React, { useState, useEffect } from 'react';
import * as yup from 'yup';
import { postsApi } from '../services/postsApi';
import { ApiError, ErrorCodes } from '../utils/ApiError';
import MentionTextarea from './MentionTextarea';
import './CreatePost.css';

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

const postSchema = yup.object().shape({
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

function CreatePost({ senderId, onPostCreated, compact = false }) {
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

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [selectedMedia]);

  const isVideoPreview = Boolean(selectedMedia?.type?.startsWith('video/'));

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

    if (selectedMedia) {
      if (!ALLOWED_MEDIA_TYPES.includes(selectedMedia.type)) {
        setValidationErrors({ image: 'Only JPG, PNG, GIF, WEBP, MP4, WEBM, and OGG files are allowed.' });
        setError('Validation error. Please check your input.');
        return false;
      }

      if (selectedMedia.size > MAX_MEDIA_SIZE_BYTES) {
        setValidationErrors({ image: 'The media file cannot be larger than 25 MB.' });
        setError('Validation error. Please check your input.');
        return false;
      }
    }

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

      await postsApi.createPost(message.trim(), selectedMedia);

      setSuccess(true);
      setMessage('');
      setSelectedMedia(null);
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
            setError('Your session has expired. Please sign in again.');
            break;
          case ErrorCodes.NETWORK_ERROR:
            setError('Could not connect to the server. Check your internet connection.');
            break;
          case ErrorCodes.TIMEOUT_ERROR:
            setError('The request took too long. Please try again.');
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
            setError(err.message || 'An error occurred while creating the post');
        }
      } else {
        setError(err.message || 'An error occurred while creating the post');
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

  const handleImageChange = (event) => {
    const file = event.target.files?.[0] || null;
    setValidationErrors((prev) => ({ ...prev, image: null }));

    if (!file) {
      setSelectedMedia(null);
      return;
    }

    if (!ALLOWED_MEDIA_TYPES.includes(file.type)) {
      setSelectedMedia(null);
      setValidationErrors((prev) => ({ ...prev, image: 'Only JPG, PNG, GIF, WEBP, MP4, WEBM, and OGG files are allowed.' }));
      return;
    }

    if (file.size > MAX_MEDIA_SIZE_BYTES) {
      setSelectedMedia(null);
      setValidationErrors((prev) => ({ ...prev, image: 'The media file cannot be larger than 25 MB.' }));
      return;
    }

    setSelectedMedia(file);
  };

  const handleRemoveImage = () => {
    setSelectedMedia(null);
    setValidationErrors((prev) => ({ ...prev, image: null }));
  };

  return (
    <div className={`create-post-container ${compact ? 'create-post-container-compact' : ''}`}>
      {!compact && <h2 className="create-post-title">Create a new post</h2>}

      {error && (
        <div className="create-post-error" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="create-post-success" role="alert">
          The post was created successfully!
        </div>
      )}

      <form onSubmit={handleSubmit} className="create-post-form" noValidate>
        <div className="create-post-field">
          <label htmlFor="message" className="create-post-label">
            Create post <span className="required-asterisk">*</span>
          </label>
          <p className="create-post-helper-text">
            The post will be published publicly and visible to all users in the app.
          </p>
          <MentionTextarea
            id="message"
            name="message"
            value={message}
            onChange={handleMessageChange}
            onBlur={() => setTouched((prev) => ({ ...prev, message: true }))}
            placeholder={compact ? 'What is happening right now?' : 'Write your post here...'}
            className={`create-post-textarea ${
              validationErrors.message && touched.message ? 'input-error' : ''
            }`}
            rows={5}
            disabled={loading}
            maxLength={MAX_MESSAGE_LENGTH}
            excludeUserId={senderId}
            overlayClassName="create-post-textarea"
          />
          <div className="create-post-character-count">
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

        <div className="create-post-field">
          <label htmlFor="image" className="create-post-label">
            Photo or video (optional)
          </label>
          <p className="create-post-helper-text">
            You can upload JPG, PNG, GIF, WEBP, MP4, WEBM, or OGG files up to 25 MB.
          </p>
          <input
            id="image"
            name="image"
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/ogg"
            onChange={handleImageChange}
            className="create-post-file-input"
            disabled={loading}
          />

          {selectedMedia && (
            <div className="create-post-image-preview">
              {mediaPreviewUrl && (isVideoPreview ? (
                <video src={mediaPreviewUrl} className="create-post-preview-media" controls muted />
              ) : (
                <img src={mediaPreviewUrl} alt="Selected post preview" className="create-post-preview-media" />
                ))}
              <div className="create-post-image-meta">
                <span>{selectedMedia.name}</span>
                <button type="button" className="create-post-remove-image" onClick={handleRemoveImage} disabled={loading}>
                  Remove file
                </button>
              </div>
            </div>
          )}

          {validationErrors.image && (
            <div className="field-error" role="alert">
              {validationErrors.image}
            </div>
          )}
        </div>

        <button
          type="submit"
          className="create-post-button"
          disabled={loading || !senderId || !message.trim()}
        >
          {loading ? 'Publishing...' : compact ? 'Publish' : 'Create post'}
        </button>
      </form>
    </div>
  );
}

export default CreatePost;