import React, { useEffect, useMemo, useState } from 'react';
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
  postDomId,
  isHighlighted = false,
  shouldOpenComments = false,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedMessage, setEditedMessage] = useState(post.message);
  const [showComments, setShowComments] = useState(false);
  const [commentMessage, setCommentMessage] = useState('');
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentMessage, setEditingCommentMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState(null);
  const isOwner = useMemo(() => currentUserId && currentUserId === post.senderId, [currentUserId, post.senderId]);
  const targetPostId = post.targetPostId || post.originalPostId || post.id;
  const isRepostEntry = Boolean(post.isRepost);
  const canEditPost = isOwner && !isRepostEntry;
  const canRemoveRepost = isOwner && isRepostEntry;

  useEffect(() => {
    if (shouldOpenComments) {
      setShowComments(true);
    }
  }, [shouldOpenComments]);

  const senderName = usernames[post.senderId] || post.senderId;
  const senderHandle = `@${String(senderName).toLowerCase().replace(/\s+/g, '')}`;
  const senderInitial = String(senderName).charAt(0).toUpperCase();
  const originalSenderName = post.originalSenderId ? (usernames[post.originalSenderId] || post.originalSenderId) : null;
  const originalHandle = originalSenderName ? `@${String(originalSenderName).toLowerCase().replace(/\s+/g, '')}` : null;
  const originalInitial = String(originalSenderName || '').charAt(0).toUpperCase();

  const getFriendlyError = (error, fallbackMessage) => {
    if (error instanceof ApiError) {
      switch (error.errorCode) {
        case ErrorCodes.FORBIDDEN:
          return 'You can only modify your own posts.';
        case ErrorCodes.POST_NOT_FOUND:
          return 'The post could not be found.';
        case ErrorCodes.VALIDATION_ERROR:
          return error.message || 'Validation error. Please check your post.';
        case ErrorCodes.NETWORK_ERROR:
          return 'Could not connect to the server.';
        case ErrorCodes.TIMEOUT_ERROR:
          return 'The request took too long. Please try again.';
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
      await postsApi.updatePost(targetPostId, editedMessage.trim());
      setIsEditing(false);
      if (onPostChanged) {
        await onPostChanged();
      }
    } catch (error) {
      setActionError(getFriendlyError(error, 'Could not update the post.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm('Do you really want to delete this post?');
    if (!confirmed) {
      return;
    }

    try {
      setIsSubmitting(true);
      setActionError(null);
      await postsApi.deletePost(targetPostId);
      if (onPostChanged) {
        await onPostChanged();
      }
    } catch (error) {
      setActionError(getFriendlyError(error, 'Could not delete the post.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleLike = async () => {
    try {
      setIsSubmitting(true);
      setActionError(null);
      if (post.isLikedByCurrentUser) {
        await postsApi.unlikePost(targetPostId);
      } else {
        await postsApi.likePost(targetPostId);
      }

      if (onPostChanged) {
        await onPostChanged();
      }
    } catch (error) {
      setActionError(getFriendlyError(error, 'Could not update the like.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleBookmark = async () => {
    try {
      setIsSubmitting(true);
      setActionError(null);
      if (post.isBookmarkedByCurrentUser) {
        await postsApi.removeBookmark(targetPostId);
      } else {
        await postsApi.bookmarkPost(targetPostId);
      }

      if (onPostChanged) {
        await onPostChanged();
      }
    } catch (error) {
      setActionError(getFriendlyError(error, 'Could not update the saved state of the post.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleRepost = async () => {
    try {
      setIsSubmitting(true);
      setActionError(null);
      if (post.isRepostedByCurrentUser) {
        await postsApi.removeRepost(targetPostId);
      } else {
        await postsApi.repostPost(targetPostId);
      }

      if (onPostChanged) {
        await onPostChanged();
      }
    } catch (error) {
      setActionError(getFriendlyError(error, 'Could not update the repost.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddComment = async () => {
    try {
      setIsSubmitting(true);
      setActionError(null);
      await postsApi.addComment(targetPostId, commentMessage.trim());
      setCommentMessage('');
      setShowComments(true);

      if (onPostChanged) {
        await onPostChanged();
      }
    } catch (error) {
      setActionError(getFriendlyError(error, 'Could not add the comment.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    const confirmed = window.confirm('Do you really want to delete this comment?');
    if (!confirmed) {
      return;
    }

    try {
      setIsSubmitting(true);
      setActionError(null);
      await postsApi.deleteComment(targetPostId, commentId);

      if (onPostChanged) {
        await onPostChanged();
      }
    } catch (error) {
      setActionError(getFriendlyError(error, 'Could not delete the comment.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartCommentEdit = (comment) => {
    setEditingCommentId(comment.id);
    setEditingCommentMessage(comment.message);
    setActionError(null);
  };

  const handleCancelCommentEdit = () => {
    setEditingCommentId(null);
    setEditingCommentMessage('');
    setActionError(null);
  };

  const handleSaveCommentEdit = async (commentId) => {
    try {
      setIsSubmitting(true);
      setActionError(null);
      await postsApi.updateComment(targetPostId, commentId, editingCommentMessage.trim());
      setEditingCommentId(null);
      setEditingCommentMessage('');

      if (onPostChanged) {
        await onPostChanged();
      }
    } catch (error) {
      setActionError(getFriendlyError(error, 'Could not update the comment.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const recipientContent = !isPublicPost(post) && (
    recipientWrapperClassName ? (
      <div className={recipientWrapperClassName}>
        <span className="post-recipient">To: {usernames[post.recipientId] || post.recipientId}</span>
      </div>
    ) : (
      <div className="post-recipient">To: {usernames[post.recipientId] || post.recipientId}</div>
    )
  );

  return (
    <div id={postDomId} className={`${containerClassName} ${isHighlighted ? 'post-item-highlighted' : ''}`.trim()}>
      <div className="post-layout">
        <div className="post-avatar" aria-hidden="true">{senderInitial}</div>
        <div className="post-content">
          <div className="post-header">
            <div className="post-identity-row">
              <span className="post-sender">{senderName}</span>
              <span className="post-handle">{senderHandle}</span>
              {isRepostEntry && <span className="post-repost-pill">reposted</span>}
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
              <div className="post-edit-meta">{editedMessage.length} / 500 characters</div>
              <div className="post-edit-actions">
                <button
                  type="button"
                  className="post-action-button post-action-primary"
                  onClick={handleSaveEdit}
                  disabled={isSubmitting || !editedMessage.trim()}
                >
                  {isSubmitting ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  className="post-action-button"
                  onClick={handleCancelEdit}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : isRepostEntry ? (
            <div className="post-repost-card">
              <div className="post-repost-header">
                <div className="post-repost-avatar" aria-hidden="true">{originalInitial}</div>
                <div className="post-repost-meta">
                  <div className="post-identity-row">
                    <span className="post-sender">{originalSenderName}</span>
                    {originalHandle && <span className="post-handle">{originalHandle}</span>}
                    <span className="post-separator">·</span>
                    <span className="post-date">{post.originalCreatedAt ? formatDate(post.originalCreatedAt) : ''}</span>
                  </div>
                </div>
              </div>
              <div className="post-message">{post.originalMessage}</div>
              {post.originalImageUrl && (
                <div className="post-image-wrapper">
                  <img src={post.originalImageUrl} alt="Reposted content preview" className="post-image" />
                </div>
              )}
            </div>
          ) : (
            <div className="post-message">{post.message}</div>
          )}

          {!isRepostEntry && post.imageUrl && (
            <div className="post-image-wrapper">
              <img src={post.imageUrl} alt="Post attachment preview" className="post-image" />
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
              {post.isLikedByCurrentUser ? 'Liked' : 'Like'} ({post.likeCount || 0})
            </button>
            <button
              type="button"
              className="post-action-button"
              onClick={() => setShowComments((prev) => !prev)}
            >
              Replies ({post.comments?.length || 0})
            </button>
            <button
              type="button"
              className={`post-action-button ${post.isRepostedByCurrentUser ? 'post-action-reposted' : ''}`}
              onClick={handleToggleRepost}
              disabled={isSubmitting}
            >
              {post.isRepostedByCurrentUser ? 'Reposted' : 'Repost'} ({post.repostCount || 0})
            </button>
            <button
              type="button"
              className={`post-action-button ${post.isBookmarkedByCurrentUser ? 'post-action-bookmarked' : ''}`}
              onClick={handleToggleBookmark}
              disabled={isSubmitting}
            >
              {post.isBookmarkedByCurrentUser ? 'Saved' : 'Save'}
            </button>
          </div>

          {showComments && (
            <div className="post-comments-section">
              <div className="post-comment-form">
                <textarea
                  className="post-comment-textarea"
                  value={commentMessage}
                  onChange={(event) => setCommentMessage(event.target.value)}
                  placeholder="Write a comment..."
                  rows="3"
                  disabled={isSubmitting}
                  maxLength={500}
                />
                <div className="post-comment-form-footer">
                  <span className="post-edit-meta">{commentMessage.length} / 500 characters</span>
                  <button
                    type="button"
                    className="post-action-button post-action-primary"
                    onClick={handleAddComment}
                    disabled={isSubmitting || !commentMessage.trim()}
                  >
                    Reply
                  </button>
                </div>
              </div>

              <div className="post-comments-list">
                {(post.comments || []).length === 0 ? (
                  <div className="post-comments-empty">No comments yet.</div>
                ) : (
                  post.comments.map((comment) => (
                    <div key={comment.id} className="post-comment-item">
                      <div className="post-comment-header">
                        <div className="post-comment-meta">
                          <span className="post-comment-user">{usernames[comment.userId] || comment.userId}</span>
                          <span className="post-comment-date">{formatDate(comment.createdAt)}</span>
                        </div>
                        {currentUserId === comment.userId && (
                          <div className="post-comment-actions">
                            {editingCommentId === comment.id ? (
                              <>
                                <button
                                  type="button"
                                  className="post-comment-edit-button"
                                  onClick={() => handleSaveCommentEdit(comment.id)}
                                  disabled={isSubmitting || !editingCommentMessage.trim()}
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  className="post-comment-cancel-button"
                                  onClick={handleCancelCommentEdit}
                                  disabled={isSubmitting}
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  className="post-comment-edit-button"
                                  onClick={() => handleStartCommentEdit(comment)}
                                  disabled={isSubmitting}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="post-comment-delete-button"
                                  onClick={() => handleDeleteComment(comment.id)}
                                  disabled={isSubmitting}
                                >
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                      {editingCommentId === comment.id ? (
                        <div className="post-comment-edit-container">
                          <textarea
                            className="post-comment-textarea post-comment-edit-textarea"
                            value={editingCommentMessage}
                            onChange={(event) => setEditingCommentMessage(event.target.value)}
                            rows="3"
                            maxLength={500}
                            disabled={isSubmitting}
                          />
                          <div className="post-edit-meta">{editingCommentMessage.length} / 500 characters</div>
                        </div>
                      ) : (
                        <div className="post-comment-message">{comment.message}</div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {canEditPost && !isEditing && (
            <div className="post-actions">
              <button
                type="button"
                className="post-action-button"
                onClick={handleStartEdit}
                disabled={isSubmitting}
              >
                Edit
              </button>
              <button
                type="button"
                className="post-action-button post-action-danger"
                onClick={handleDelete}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          )}

          {canRemoveRepost && (
            <div className="post-actions">
              <button
                type="button"
                className="post-action-button post-action-danger"
                onClick={handleToggleRepost}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Deleting...' : 'Remove repost'}
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