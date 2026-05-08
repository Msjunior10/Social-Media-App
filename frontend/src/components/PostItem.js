import React, { useEffect, useMemo, useState } from 'react';
import { postsApi } from '../services/postsApi';
import { ApiError, ErrorCodes } from '../utils/ApiError';
import MentionTextarea from './MentionTextarea';
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
  const [interactionState, setInteractionState] = useState({
    isLikedByCurrentUser: Boolean(post.isLikedByCurrentUser),
    likeCount: post.likeCount || 0,
    isBookmarkedByCurrentUser: Boolean(post.isBookmarkedByCurrentUser),
    isRepostedByCurrentUser: Boolean(post.isRepostedByCurrentUser),
    repostCount: post.repostCount || 0,
  });
  const [commentsState, setCommentsState] = useState(post.comments || []);
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

  useEffect(() => {
    setCommentsState(post.comments || []);
  }, [post.comments]);

  useEffect(() => {
    setInteractionState({
      isLikedByCurrentUser: Boolean(post.isLikedByCurrentUser),
      likeCount: post.likeCount || 0,
      isBookmarkedByCurrentUser: Boolean(post.isBookmarkedByCurrentUser),
      isRepostedByCurrentUser: Boolean(post.isRepostedByCurrentUser),
      repostCount: post.repostCount || 0,
    });
  }, [
    post.isLikedByCurrentUser,
    post.likeCount,
    post.isBookmarkedByCurrentUser,
    post.isRepostedByCurrentUser,
    post.repostCount,
  ]);

  const senderName = usernames[post.senderId] || post.senderId;
  const senderHandle = `@${String(senderName).toLowerCase().replace(/\s+/g, '')}`;
  const senderInitial = String(senderName).charAt(0).toUpperCase();
  const originalSenderName = post.originalSenderId ? (usernames[post.originalSenderId] || post.originalSenderId) : null;
  const originalHandle = originalSenderName ? `@${String(originalSenderName).toLowerCase().replace(/\s+/g, '')}` : null;
  const originalInitial = String(originalSenderName || '').charAt(0).toUpperCase();
  const currentUserName = usernames[currentUserId] || currentUserId;
  const hasMedia = Boolean(post.imageUrl || post.originalImageUrl);
  const replyCount = commentsState.length;
  const likeCount = interactionState.likeCount;
  const repostCount = interactionState.repostCount;

  const postMetaItems = [
    isRepostEntry ? 'Repost' : (isPublicPost(post) ? 'Public post' : 'Wall post'),
    hasMedia ? 'Media attached' : null,
    `${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}`,
    `${likeCount} ${likeCount === 1 ? 'like' : 'likes'}`,
    repostCount > 0 ? `${repostCount} ${repostCount === 1 ? 'repost' : 'reposts'}` : null,
  ].filter(Boolean);

  const isVideoUrl = (url) => {
    if (!url) {
      return false;
    }

    try {
      const parsedUrl = new URL(url, window.location.origin);
      return /\.(mp4|webm|ogg)$/i.test(parsedUrl.pathname);
    } catch {
      return /\.(mp4|webm|ogg)(\?.*)?$/i.test(url);
    }
  };

  const renderPostMedia = (url, altText) => {
    if (!url) {
      return null;
    }

    return (
      <div className="post-image-wrapper">
        {isVideoUrl(url) ? (
          <video src={url} className="post-media" autoPlay muted loop playsInline controls preload="metadata" />
        ) : (
          <img src={url} alt={altText} className="post-media" />
        )}
      </div>
    );
  };

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
      if (interactionState.isLikedByCurrentUser) {
        await postsApi.unlikePost(targetPostId);
      } else {
        await postsApi.likePost(targetPostId);
      }

      setInteractionState((current) => ({
        ...current,
        isLikedByCurrentUser: !current.isLikedByCurrentUser,
        likeCount: current.isLikedByCurrentUser
          ? Math.max(0, current.likeCount - 1)
          : current.likeCount + 1,
      }));
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
      if (interactionState.isBookmarkedByCurrentUser) {
        await postsApi.removeBookmark(targetPostId);
      } else {
        await postsApi.bookmarkPost(targetPostId);
      }

      setInteractionState((current) => ({
        ...current,
        isBookmarkedByCurrentUser: !current.isBookmarkedByCurrentUser,
      }));
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
      if (interactionState.isRepostedByCurrentUser) {
        await postsApi.removeRepost(targetPostId);
      } else {
        await postsApi.repostPost(targetPostId);
      }

      if (isRepostEntry && onPostChanged) {
        await onPostChanged();
        return;
      }

      setInteractionState((current) => ({
        ...current,
        isRepostedByCurrentUser: !current.isRepostedByCurrentUser,
        repostCount: current.isRepostedByCurrentUser
          ? Math.max(0, current.repostCount - 1)
          : current.repostCount + 1,
      }));
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
      const trimmedCommentMessage = commentMessage.trim();
      const createdComment = await postsApi.addComment(targetPostId, trimmedCommentMessage);
      const fallbackComment = {
        id: `temp-${Date.now()}`,
        userId: currentUserId,
        message: trimmedCommentMessage,
        createdAt: new Date().toISOString(),
      };
      const nextComment = createdComment && typeof createdComment === 'object' && !Array.isArray(createdComment)
        ? {
            id: createdComment.id ?? fallbackComment.id,
            userId: createdComment.userId ?? fallbackComment.userId,
            message: createdComment.message ?? fallbackComment.message,
            createdAt: createdComment.createdAt ?? fallbackComment.createdAt,
          }
        : fallbackComment;

      setCommentsState((current) => [...current, nextComment]);
      setCommentMessage('');
      setShowComments(true);
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
      setCommentsState((current) => current.filter((comment) => comment.id !== commentId));
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
      setCommentsState((current) => current.map((comment) => (
        comment.id === commentId
          ? { ...comment, message: editingCommentMessage.trim() }
          : comment
      )));
      setEditingCommentId(null);
      setEditingCommentMessage('');
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

  const renderFormattedText = (text) => String(text ?? '').split(/(@[A-Za-z0-9_]{3,50}|#[A-Za-z0-9_]+)/g).map((segment, index) => {
    if (/^@[A-Za-z0-9_]{3,50}$/.test(segment)) {
      return <span key={`mention-${index}`} className="post-mention">{segment}</span>;
    }

    if (/^#[A-Za-z0-9_]+$/.test(segment)) {
      return <span key={`hashtag-${index}`} className="post-hashtag">{segment}</span>;
    }

    return <span key={`text-${index}`}>{segment}</span>;
  });

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

          <div className="post-meta-strip" aria-label="Post summary">
            {postMetaItems.map((item) => (
              <span key={item} className="post-meta-chip">{item}</span>
            ))}
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
              <div className="post-message">{renderFormattedText(post.originalMessage)}</div>
              {renderPostMedia(post.originalImageUrl, 'Reposted content preview')}
            </div>
          ) : (
            <div className="post-message">{renderFormattedText(post.message)}</div>
          )}

          {!isRepostEntry && renderPostMedia(post.imageUrl, 'Post attachment preview')}

          {recipientContent}

          <div className="post-social-bar">
            <button
              type="button"
              className={`post-action-button ${interactionState.isLikedByCurrentUser ? 'post-action-liked' : ''}`}
              onClick={handleToggleLike}
              disabled={isSubmitting}
            >
              {interactionState.isLikedByCurrentUser ? '♥ Liked' : '♥ Like'} ({interactionState.likeCount})
            </button>
            <button
              type="button"
              className="post-action-button"
              onClick={() => setShowComments((prev) => !prev)}
            >
              💬 Replies ({commentsState.length})
            </button>
            <button
              type="button"
              className={`post-action-button ${interactionState.isRepostedByCurrentUser ? 'post-action-reposted' : ''}`}
              onClick={handleToggleRepost}
              disabled={isSubmitting}
            >
              {interactionState.isRepostedByCurrentUser ? '↻ Reposted' : '↻ Repost'} ({interactionState.repostCount})
            </button>
            <button
              type="button"
              className={`post-action-button ${interactionState.isBookmarkedByCurrentUser ? 'post-action-bookmarked' : ''}`}
              onClick={handleToggleBookmark}
              disabled={isSubmitting}
            >
              {interactionState.isBookmarkedByCurrentUser ? '★ Saved' : '☆ Save'}
            </button>
          </div>

          {showComments && (
            <div className="post-comments-section">
              <div className="post-comment-form">
                <MentionTextarea
                  className="post-comment-textarea"
                  value={commentMessage}
                  onChange={(event) => setCommentMessage(event.target.value)}
                  placeholder="Write a comment..."
                  rows={3}
                  disabled={isSubmitting}
                  maxLength={500}
                  excludeUserId={currentUserId}
                  overlayClassName="post-comment-textarea"
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
                {commentsState.length === 0 ? (
                  <div className="post-comments-empty">No comments yet.</div>
                ) : (
                  commentsState.map((comment) => (
                    <div key={comment.id} className="post-comment-item">
                      <div className="post-comment-header">
                        <div className="post-comment-meta">
                          <span className="post-comment-user">{usernames[comment.userId] || (comment.userId === currentUserId ? currentUserName : comment.userId)}</span>
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
                        <div className="post-comment-message">{renderFormattedText(comment.message)}</div>
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
                {isSubmitting ? 'Deleting...' : '🗑 Remove repost'}
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