import React, { useState, useEffect, useCallback } from 'react';
import { wallApi } from '../services/wallApi';
import { userApi } from '../services/userApi';
import PostItem from './PostItem';
import './Wall.css';

function Wall({ userId, refreshKey = 0, showHeader = true }) {
  const [posts, setPosts] = useState([]);
  const [usernames, setUsernames] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchWall = useCallback(async () => {
    if (!userId) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const wallPosts = await wallApi.getWall();
      // Sort posts so the newest appears first (chronological order)
      const sortedPosts = wallPosts.sort((a, b) => {
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
      setError(err.message || 'Could not fetch wall');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchWall();
    }
  }, [userId, fetchWall, refreshKey]);

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
      <div className="wall">
        <div className="wall-header">
          {showHeader && <h2>Wall</h2>}
        </div>
        <div className="loading">
          <span className="loading-spinner"></span>
          <span>Loading wall...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="wall">
      {showHeader && (
        <div className="wall-header">
          <h2>Wall</h2>
          <button
            onClick={fetchWall}
            className="wall-refresh-button"
            disabled={loading}
            title="Refresh wall"
            aria-label="Refresh wall"
          >
            <span className={loading ? 'refresh-icon spinning' : 'refresh-icon'}>⟳</span>
          </button>
        </div>
      )}

      {error && (
        <div className="error-message" role="alert">
          <span className="error-icon">⚠️</span>
          <span className="error-text">{error}</span>
          <button onClick={fetchWall} className="error-retry-button">
            Try again
          </button>
        </div>
      )}

      {posts.length === 0 && !loading && !error ? (
        <div className="empty-message">
          <p>No public posts to show yet.</p>
          <p className="empty-hint">Create a post to fill the feed.</p>
        </div>
      ) : (
        <div className="posts-container">
          {posts.map((post) => (
            <PostItem
              key={post.id}
              post={post}
              usernames={usernames}
              currentUserId={userId}
              formatDate={formatDate}
              isPublicPost={isPublicPost}
              onPostChanged={fetchWall}
              containerClassName="post-card"
              recipientWrapperClassName="post-footer"
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default Wall;
