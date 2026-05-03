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
  const [showComments, setShowComments] = useState(false);
  const [commentMessage, setCommentMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState(null);

  const isOwner = useMemo(() => currentUserId && currentUserId === post.senderId, [currentUserId, post.senderId]);
  const senderName = usernames[post.senderId] || post.senderId;
  const senderHandle = `@${String(senderName).toLowerCase().replace(/\s+/g, '')}`;
  const senderInitial = String(senderName).charAt(0).toUpperCase();

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

  const handleToggleLike = async () => {
    try {
      setIsSubmitting(true);
      setActionError(null);
      if (post.isLikedByCurrentUser) {
        await postsApi.unlikePost(post.id);
      } else {
        await postsApi.likePost(post.id);
      }

      if (onPostChanged) {
        await onPostChanged();
      }
    } catch (error) {
      setActionError(getFriendlyError(error, 'Kunde inte uppdatera gillningen.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddComment = async () => {
    try {
      setIsSubmitting(true);
      setActionError(null);
      await postsApi.addComment(post.id, commentMessage.trim());
      setCommentMessage('');
      setShowComments(true);

      if (onPostChanged) {
        await onPostChanged();
      }
    } catch (error) {
      setActionError(getFriendlyError(error, 'Kunde inte lägga till kommentaren.'));
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
      <div className="post-layout">
        <div className="post-avatar" aria-hidden="true">{senderInitial}</div>
        <div className="post-content">
          <div className="post-header">
            <div className="post-identity-row">
              <span className="post-sender">{senderName}</span>
              <span className="post-handle">{senderHandle}</span>
              <span className="post-separator">·</span>
              <span className="post-date">{formatDate(post.createdAt)}</span>
            </div>
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

          {post.imageUrl && (
            <div className="post-image-wrapper">
              <img src={post.imageUrl} alt="Bild bifogad till inlägg" className="post-image" />
            </div>
          )}

          {recipientContent}

          <div className="post-social-bar">
            <button
              type="button"
              className={`post-action-button ${post.isLikedByCurrentUser ? 'post-action-liked' : ''}`}
              onClick={handleToggleLike}
              disabled={isSubmitting}
            >
              {post.isLikedByCurrentUser ? 'Gillad' : 'Gilla'} ({post.likeCount || 0})
            </button>
            <button
              type="button"
              className="post-action-button"
              onClick={() => setShowComments((prev) => !prev)}
            >
              Svar ({post.comments?.length || 0})
            </button>
          </div>

          {showComments && (
            <div className="post-comments-section">
              <div className="post-comment-form">
                <textarea
                  className="post-comment-textarea"
                  value={commentMessage}
                  onChange={(event) => setCommentMessage(event.target.value)}
                  placeholder="Skriv en kommentar..."
                  rows="3"
                  disabled={isSubmitting}
                  maxLength={500}
                />
                <div className="post-comment-form-footer">
                  <span className="post-edit-meta">{commentMessage.length} / 500 tecken</span>
                  <button
                    type="button"
                    className="post-action-button post-action-primary"
                    onClick={handleAddComment}
                    disabled={isSubmitting || !commentMessage.trim()}
                  >
                    Svara
                  </button>
                </div>
              </div>

              <div className="post-comments-list">
                {(post.comments || []).length === 0 ? (
                  <div className="post-comments-empty">Inga kommentarer ännu.</div>
                ) : (
                  post.comments.map((comment) => (
                    <div key={comment.id} className="post-comment-item">
                      <div className="post-comment-header">
                        <span className="post-comment-user">{usernames[comment.userId] || comment.userId}</span>
                        <span className="post-comment-date">{formatDate(comment.createdAt)}</span>
                      </div>
                      <div className="post-comment-message">{comment.message}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

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
      </div>
    </div>
  );
}

export default PostItem;