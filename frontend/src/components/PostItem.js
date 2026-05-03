import React, { useMemo, useState } from 'react';
import { postsApi } from '../services/postsApi';
import { ApiError, ErrorCodes } from '../utils/ApiError';
import './PostItem.css';

function PostItem({
  post,
  usernames,
  currentUserId,
  formatDate,
  isPublicPost,
  onPostChanged,
  containerClassName = 'post-item',
  recipientWrapperClassName,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedMessage, setEditedMessage] = useState(post.message);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState(null);

  const isOwner = useMemo(() => currentUserId && currentUserId === post.senderId, [currentUserId, post.senderId]);

  const getFriendlyError = (error, fallbackMessage) => {
    if (error instanceof ApiError) {
      switch (error.errorCode) {
        case ErrorCodes.FORBIDDEN:
          return 'Du kan bara ändra dina egna inlägg.';
        case ErrorCodes.POST_NOT_FOUND:
          return 'Inlägget kunde inte hittas.';
        case ErrorCodes.VALIDATION_ERROR:
          return error.message || 'Valideringsfel. Kontrollera ditt inlägg.';
        case ErrorCodes.NETWORK_ERROR:
          return 'Kunde inte ansluta till servern.';
        case ErrorCodes.TIMEOUT_ERROR:
          return 'Begäran tog för lång tid. Försök igen.';
        default:
          return error.message || fallbackMessage;
      }
    }

    return error?.message || fallbackMessage;
  };

  const handleStartEdit = () => {
    setEditedMessage(post.message);
    setActionError(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditedMessage(post.message);
    setActionError(null);
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    try {
      setIsSubmitting(true);
      setActionError(null);
      await postsApi.updatePost(post.id, editedMessage.trim());
      setIsEditing(false);
      if (onPostChanged) {
        await onPostChanged();
      }
    } catch (error) {
      setActionError(getFriendlyError(error, 'Kunde inte uppdatera inlägget.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm('Vill du verkligen ta bort det här inlägget?');
    if (!confirmed) {
      return;
    }

    try {
      setIsSubmitting(true);
      setActionError(null);
      await postsApi.deletePost(post.id);
      if (onPostChanged) {
        await onPostChanged();
      }
    } catch (error) {
      setActionError(getFriendlyError(error, 'Kunde inte ta bort inlägget.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const recipientContent = !isPublicPost(post) && (
    recipientWrapperClassName ? (
      <div className={recipientWrapperClassName}>
        <span className="post-recipient">Till: {usernames[post.recipientId] || post.recipientId}</span>
      </div>
    ) : (
      <div className="post-recipient">Till: {usernames[post.recipientId] || post.recipientId}</div>
    )
  );

  return (
    <div className={containerClassName}>
      <div className="post-header">
        <span className="post-sender">Från: {usernames[post.senderId] || post.senderId}</span>
        <span className="post-date">{formatDate(post.createdAt)}</span>
      </div>

      {isEditing ? (
        <div className="post-edit-container">
          <textarea
            className="post-edit-textarea"
            value={editedMessage}
            onChange={(event) => setEditedMessage(event.target.value)}
            disabled={isSubmitting}
            rows="4"
            maxLength={500}
          />
          <div className="post-edit-meta">{editedMessage.length} / 500 tecken</div>
          <div className="post-edit-actions">
            <button
              type="button"
              className="post-action-button post-action-primary"
              onClick={handleSaveEdit}
              disabled={isSubmitting || !editedMessage.trim()}
            >
              {isSubmitting ? 'Sparar...' : 'Spara'}
            </button>
            <button
              type="button"
              className="post-action-button"
              onClick={handleCancelEdit}
              disabled={isSubmitting}
            >
              Avbryt
            </button>
          </div>
        </div>
      ) : (
        <div className="post-message">{post.message}</div>
      )}

      {recipientContent}

      {isOwner && !isEditing && (
        <div className="post-actions">
          <button
            type="button"
            className="post-action-button"
            onClick={handleStartEdit}
            disabled={isSubmitting}
          >
            Redigera
          </button>
          <button
            type="button"
            className="post-action-button post-action-danger"
            onClick={handleDelete}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Tar bort...' : 'Ta bort'}
          </button>
        </div>
      )}

      {actionError && <div className="post-action-error">{actionError}</div>}
    </div>
  );
}

export default PostItem;