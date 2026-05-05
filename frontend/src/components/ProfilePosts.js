import React, { useState, useEffect, useCallback } from 'react';
import { postsApi } from '../services/postsApi';
import { userApi } from '../services/userApi';
import { ApiError, ErrorCodes } from '../utils/ApiError';
import PostItem from './PostItem';
import './Timeline.css';

function ProfilePosts({
  userId,
  username,
  isOwnProfile = false,
  currentUserId = null,
  refreshKey = 0,
  highlightedPostId = null,
  openCommentsPostId = null,
}) {
  const [posts, setPosts] = useState([]);
  const [usernames, setUsernames] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPosts = useCallback(async () => {
    if (!userId) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const profilePosts = await postsApi.getTimelineByUserId(userId);
      const sortedPosts = [...profilePosts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setPosts(sortedPosts);

      const uniqueUserIds = new Set();
      sortedPosts.forEach((post) => {
        if (post.senderId) uniqueUserIds.add(post.senderId);
        if (post.recipientId) uniqueUserIds.add(post.recipientId);
        if (post.originalSenderId) uniqueUserIds.add(post.originalSenderId);
        (post.comments || []).forEach((comment) => {
          if (comment.userId) uniqueUserIds.add(comment.userId);
        });
      });

      const usernameMap = {};
      await Promise.all(
        Array.from(uniqueUserIds).map(async (id) => {
          try {
            const user = await userApi.getUserById(id);
            if (user) {
              usernameMap[id] = user.username;
            }
          } catch {
            usernameMap[id] = id;
          }
        })
      );
      setUsernames(usernameMap);
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
          case ErrorCodes.INVALID_USER_ID:
            setError('Invalid user.');
            break;
          default:
            setError(err.message || 'Could not fetch the user\'s posts');
        }
      } else {
        setError(err.message || 'Could not fetch the user\'s posts');
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchPosts();
    }
  }, [userId, fetchPosts, refreshKey]);

  useEffect(() => {
    if (!highlightedPostId || posts.length === 0) {
      return;
    }

    const hasMatchingPost = posts.some((post) => {
      const postMatchId = post.targetPostId || post.originalPostId || post.id;
      return postMatchId === highlightedPostId;
    });

    if (!hasMatchingPost) {
      return;
    }

    const animationFrameId = window.requestAnimationFrame(() => {
      const highlightedElement = document.getElementById(`post-${highlightedPostId}`);
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });

    return () => window.cancelAnimationFrame(animationFrameId);
  }, [posts, highlightedPostId]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const datePart = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    const timePart = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${datePart} · ${timePart}`;
  };

  const isPublicPost = (post) => !post.recipientId || post.recipientId === post.senderId;

  const title = isOwnProfile
    ? 'My posts'
    : `${username || 'User'} posts`;

  if (loading && posts.length === 0) {
    return (
      <div className="timeline">
        <div className="timeline-header">
          <h3>{title}</h3>
        </div>
        <div className="loading">
          <span className="loading-spinner"></span>
          <span>Loading posts...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="timeline">
      <div className="timeline-header">
        <h3>{title}</h3>
        <button
          onClick={fetchPosts}
          className="timeline-refresh-button"
          disabled={loading}
          title="Refresh posts"
          aria-label="Refresh posts"
        >
          <span className={loading ? 'refresh-icon spinning' : 'refresh-icon'}>⟳</span>
        </button>
      </div>

      {error && (
        <div className="error-message" role="alert">
          <span className="error-icon">⚠️</span>
          <span className="error-text">{error}</span>
          <button onClick={fetchPosts} className="error-retry-button">
            Try again
          </button>
        </div>
      )}

      {posts.length === 0 && !loading && !error ? (
        <div className="empty-message">
          <p>No posts to show yet.</p>
          <p className="empty-hint">
            {isOwnProfile
              ? 'When you create a public post from your profile, it will appear here.'
              : 'This user has not created any public posts yet.'}
          </p>
        </div>
      ) : (
        <div className="timeline-posts">
          {posts.map((post) => (
            (() => {
              const postMatchId = post.targetPostId || post.originalPostId || post.id;

              return (
                <PostItem
                  key={post.id}
                  post={post}
                  usernames={usernames}
                  currentUserId={currentUserId}
                  formatDate={formatDate}
                  isPublicPost={isPublicPost}
                  onPostChanged={fetchPosts}
                  containerClassName="post-item"
                  postDomId={`post-${postMatchId}`}
                  isHighlighted={highlightedPostId === postMatchId}
                  shouldOpenComments={openCommentsPostId === postMatchId}
                />
              );
            })()
          ))}
        </div>
      )}
    </div>
  );
}

export default ProfilePosts;
