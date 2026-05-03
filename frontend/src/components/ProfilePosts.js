import React, { useState, useEffect, useCallback } from 'react';
import { postsApi } from '../services/postsApi';
import { userApi } from '../services/userApi';
import { ApiError, ErrorCodes } from '../utils/ApiError';
import PostItem from './PostItem';
import './Timeline.css';

function ProfilePosts({ userId, username, isOwnProfile = false, currentUserId = null }) {
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
            setError('Din session har gått ut. Logga in igen.');
            break;
          case ErrorCodes.NETWORK_ERROR:
            setError('Kunde inte ansluta till servern. Kontrollera din internetanslutning.');
            break;
          case ErrorCodes.TIMEOUT_ERROR:
            setError('Begäran tog för lång tid. Försök igen.');
            break;
          case ErrorCodes.INVALID_USER_ID:
            setError('Ogiltig användare.');
            break;
          default:
            setError(err.message || 'Kunde inte hämta användarens inlägg');
        }
      } else {
        setError(err.message || 'Kunde inte hämta användarens inlägg');
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchPosts();
    }
  }, [userId, fetchPosts]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isPublicPost = (post) => !post.recipientId || post.recipientId === post.senderId;

  const title = isOwnProfile
    ? 'Mina inlägg'
    : `${username || 'Användarens'} inlägg`;

  if (loading && posts.length === 0) {
    return (
      <div className="timeline">
        <div className="timeline-header">
          <h3>{title}</h3>
        </div>
        <div className="loading">
          <span className="loading-spinner"></span>
          <span>Laddar inlägg...</span>
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
          title="Uppdatera inlägg"
          aria-label="Uppdatera inlägg"
        >
          <span className={loading ? 'refresh-icon spinning' : 'refresh-icon'}>⟳</span>
        </button>
      </div>

      {error && (
        <div className="error-message" role="alert">
          <span className="error-icon">⚠️</span>
          <span className="error-text">{error}</span>
          <button onClick={fetchPosts} className="error-retry-button">
            Försök igen
          </button>
        </div>
      )}

      {posts.length === 0 && !loading && !error ? (
        <div className="empty-message">
          <p>Inga inlägg att visa ännu.</p>
          <p className="empty-hint">
            {isOwnProfile
              ? 'När du skapar ett offentligt inlägg visas det här.'
              : 'Den här användaren har inte skapat några offentliga inlägg ännu.'}
          </p>
        </div>
      ) : (
        <div className="timeline-posts">
          {posts.map((post) => (
            <PostItem
              key={post.id}
              post={post}
              usernames={usernames}
              currentUserId={currentUserId}
              formatDate={formatDate}
              isPublicPost={isPublicPost}
              onPostChanged={fetchPosts}
              containerClassName="post-item"
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default ProfilePosts;
