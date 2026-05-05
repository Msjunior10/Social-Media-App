import React, { useState, useEffect, useCallback } from 'react';
import { postsApi } from '../services/postsApi';
import { userApi } from '../services/userApi';
import { ApiError, ErrorCodes } from '../utils/ApiError';
import PostItem from './PostItem';
import './Timeline.css';

function SavedPosts({ userId, showHeader = true }) {
  const [posts, setPosts] = useState([]);
  const [usernames, setUsernames] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSavedPosts = useCallback(async () => {
    if (!userId) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const savedPosts = await postsApi.getSavedPosts();
      setPosts(savedPosts || []);

      const uniqueUserIds = new Set();
      (savedPosts || []).forEach((post) => {
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
          default:
            setError(err.message || 'Could not fetch saved posts.');
        }
      } else {
        setError(err.message || 'Could not fetch saved posts.');
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchSavedPosts();
  }, [fetchSavedPosts]);

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

  if (loading && posts.length === 0) {
    return (
      <div className="timeline">
        {showHeader && (
          <div className="timeline-header">
            <h3>Saved posts</h3>
          </div>
        )}
        <div className="loading">
          <span className="loading-spinner"></span>
          <span>Loading saved posts...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="timeline">
      {showHeader && (
        <div className="timeline-header">
          <h3>Saved posts</h3>
          <button
            onClick={fetchSavedPosts}
            className="timeline-refresh-button"
            disabled={loading}
            title="Refresh saved posts"
            aria-label="Refresh saved posts"
          >
            <span className={loading ? 'refresh-icon spinning' : 'refresh-icon'}>⟳</span>
          </button>
        </div>
      )}

      {error && (
        <div className="error-message" role="alert">
          <span className="error-icon">⚠️</span>
          <span className="error-text">{error}</span>
          <button onClick={fetchSavedPosts} className="error-retry-button">
            Try again
          </button>
        </div>
      )}

      {posts.length === 0 && !loading && !error ? (
        <div className="empty-message">
          <p>You have not saved any posts yet.</p>
          <p className="empty-hint">Press Save on a post to keep things you want to read again.</p>
        </div>
      ) : (
        <div className="timeline-posts">
          {posts.map((post) => (
            <PostItem
              key={post.id}
              post={post}
              usernames={usernames}
              currentUserId={userId}
              formatDate={formatDate}
              isPublicPost={isPublicPost}
              onPostChanged={fetchSavedPosts}
              containerClassName="post-item"
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default SavedPosts;