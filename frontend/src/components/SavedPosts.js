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
            setError('Din session har gått ut. Logga in igen.');
            break;
          case ErrorCodes.NETWORK_ERROR:
            setError('Kunde inte ansluta till servern. Kontrollera din internetanslutning.');
            break;
          case ErrorCodes.TIMEOUT_ERROR:
            setError('Begäran tog för lång tid. Försök igen.');
            break;
          default:
            setError(err.message || 'Kunde inte hämta sparade inlägg.');
        }
      } else {
        setError(err.message || 'Kunde inte hämta sparade inlägg.');
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
    const datePart = date.toLocaleDateString('sv-SE', {
      month: 'short',
      day: 'numeric',
    });
    const timePart = date.toLocaleTimeString('sv-SE', {
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
            <h3>Sparade inlägg</h3>
          </div>
        )}
        <div className="loading">
          <span className="loading-spinner"></span>
          <span>Laddar sparade inlägg...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="timeline">
      {showHeader && (
        <div className="timeline-header">
          <h3>Sparade inlägg</h3>
          <button
            onClick={fetchSavedPosts}
            className="timeline-refresh-button"
            disabled={loading}
            title="Uppdatera sparade inlägg"
            aria-label="Uppdatera sparade inlägg"
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
            Försök igen
          </button>
        </div>
      )}

      {posts.length === 0 && !loading && !error ? (
        <div className="empty-message">
          <p>Du har inte sparat några inlägg ännu.</p>
          <p className="empty-hint">Tryck på Spara i ett inlägg för att samla sådant du vill läsa igen.</p>
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