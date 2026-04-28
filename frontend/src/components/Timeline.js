import React, { useState, useEffect, useCallback } from 'react';
import { postsApi } from '../services/postsApi';
import { userApi } from '../services/userApi';
import { ApiError, ErrorCodes } from '../utils/ApiError';
import './Timeline.css';

function Timeline({ userId }) {
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
      // Sortera inlägg så att senaste kommer först (kronologisk ordning)
      const sortedPosts = timelinePosts.sort((a, b) => {
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      setPosts(sortedPosts);

      // Hämta användarnamn för alla unika användar-ID:n
      const uniqueUserIds = new Set();
      sortedPosts.forEach(post => {
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
          } catch (err) {
            console.error(`Kunde inte hämta användare ${id}:`, err);
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
            setError('Ogiltigt användar-ID.');
            break;
          default:
            setError(err.message || 'Kunde inte hämta tidslinje');
        }
      } else {
        setError(err.message || 'Kunde inte hämta tidslinje');
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchTimeline();
    }
  }, [userId, fetchTimeline]);

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

  if (loading && posts.length === 0) {
    return (
      <div className="timeline">
        <div className="timeline-header">
          <h3>Tidslinje</h3>
        </div>
        <div className="loading">
          <span className="loading-spinner"></span>
          <span>Laddar tidslinje...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="timeline">
      <div className="timeline-header">
        <h3>Tidslinje</h3>
        <button
          onClick={fetchTimeline}
          className="timeline-refresh-button"
          disabled={loading}
          title="Uppdatera tidslinje"
          aria-label="Uppdatera tidslinje"
        >
          <span className={loading ? 'refresh-icon spinning' : 'refresh-icon'}>⟳</span>
        </button>
      </div>
      
      {error && (
        <div className="error-message" role="alert">
          <span className="error-icon">⚠️</span>
          <span className="error-text">{error}</span>
          <button onClick={fetchTimeline} className="error-retry-button">
            Försök igen
          </button>
        </div>
      )}

      {posts.length === 0 && !loading && !error ? (
        <div className="empty-message">
          <p>Inga inlägg att visa i tidslinjen.</p>
          <p className="empty-hint">Skapa ett inlägg eller vänta på att någon postar på din tidslinje.</p>
        </div>
      ) : (
        <div className="timeline-posts">
          {posts.map((post) => (
            <div key={post.id} className="post-item">
              <div className="post-header">
                <span className="post-sender">Från: {usernames[post.senderId] || post.senderId}</span>
                <span className="post-date">{formatDate(post.createdAt)}</span>
              </div>
              <div className="post-message">{post.message}</div>
              {post.recipientId && (
                <div className="post-recipient">Till: {usernames[post.recipientId] || post.recipientId}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Timeline;