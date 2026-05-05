import React, { useState, useEffect, useCallback } from 'react';
import { postsApi } from '../services/postsApi';
import { userApi } from '../services/userApi';
import { ApiError, ErrorCodes } from '../utils/ApiError';
import PostItem from './PostItem';
import './Timeline.css';

function Timeline({ userId, refreshKey = 0, showHeader = true }) {
  const [posts, setPosts] = useState([]);
  const [usernames, setUsernames] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTimeline = useCallback(async () => {
    if (!userId) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const timelinePosts = await postsApi.getTimeline();
      // Sort posts so the newest appears first (chronological order)
      const sortedPosts = timelinePosts.sort((a, b) => {
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      setPosts(sortedPosts);

      // Fetch usernames for all unique user IDs
      const uniqueUserIds = new Set();
      sortedPosts.forEach(post => {
        if (post.senderId) uniqueUserIds.add(post.senderId);
        if (post.recipientId) uniqueUserIds.add(post.recipientId);
        if (post.originalSenderId) uniqueUserIds.add(post.originalSenderId);
        (post.comments || []).forEach(comment => {
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
          } catch (err) {
            console.error(`Could not fetch user ${id}:`, err);
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
            setError('Invalid user ID.');
            break;
          default:
            setError(err.message || 'Could not fetch timeline');
        }
      } else {
        setError(err.message || 'Could not fetch timeline');
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchTimeline();
    }
  }, [userId, fetchTimeline, refreshKey]);

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
        <div className="timeline-header">
          {showHeader && <h3>Timeline</h3>}
        </div>
        <div className="loading">
          <span className="loading-spinner"></span>
          <span>Loading timeline...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="timeline">
      {showHeader && (
        <div className="timeline-header">
          <h3>Timeline</h3>
          <button
            onClick={fetchTimeline}
            className="timeline-refresh-button"
            disabled={loading}
            title="Refresh timeline"
            aria-label="Refresh timeline"
          >
            <span className={loading ? 'refresh-icon spinning' : 'refresh-icon'}>⟳</span>
          </button>
        </div>
      )}
      
      {error && (
        <div className="error-message" role="alert">
          <span className="error-icon">⚠️</span>
          <span className="error-text">{error}</span>
          <button onClick={fetchTimeline} className="error-retry-button">
            Try again
          </button>
        </div>
      )}

      {posts.length === 0 && !loading && !error ? (
        <div className="empty-message">
          <p>No posts to show in the timeline.</p>
          <p className="empty-hint">Create your first public post and it will appear here.</p>
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
              onPostChanged={fetchTimeline}
              containerClassName="post-item"
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default Timeline;