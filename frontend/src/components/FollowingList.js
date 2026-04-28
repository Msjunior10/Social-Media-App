import React, { useState, useEffect, useCallback } from 'react';
import { followApi } from '../services/followApi';
import { userApi } from '../services/userApi';
import './FollowingList.css';

function FollowingList({ userId, onFollowingClick }) {
  const [following, setFollowing] = useState([]);
  const [usernames, setUsernames] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchFollowing = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await followApi.getFollowing(userId);
      setFollowing(data);

      // Hämta användarnamn för alla följda användare
      const usernameMap = {};
      await Promise.all(
        data.map(async (follow) => {
          try {
            const user = await userApi.getUserById(follow.followingId);
            if (user) {
              usernameMap[follow.followingId] = user.username;
            }
          } catch (err) {
            console.error(`Kunde inte hämta användare ${follow.followingId}:`, err);
          }
        })
      );
      setUsernames(usernameMap);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchFollowing();
  }, [fetchFollowing]);

  if (loading) {
    return (
      <div className="following-list">
        <h3>Följer</h3>
        <div className="loading">Laddar följda användare...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="following-list">
        <h3>Följer</h3>
        <div className="error">Fel: {error}</div>
      </div>
    );
  }

  return (
    <div className="following-list">
      <div className="following-list-header">
        <h3>Följer ({following.length})</h3>
        <button
          onClick={fetchFollowing}
          className="refresh-button"
          disabled={loading}
          title="Uppdatera"
          aria-label="Uppdatera följda användare"
        >
          <span className={loading ? 'refresh-icon spinning' : 'refresh-icon'}>⟳</span>
        </button>
      </div>
      {following.length === 0 ? (
        <div className="empty-message">Följer inga användare ännu</div>
      ) : (
        <ul className="following-list-items">
          {following.map((follow) => {
            const handleFollowingClick = () => {
              if (onFollowingClick) {
                const followingUser = {
                  id: follow.followingId,
                  username: usernames[follow.followingId] || follow.followingId
                };
                onFollowingClick(followingUser);
              }
            };

            return (
              <li 
                key={follow.id} 
                className={`following-item ${onFollowingClick ? 'following-item-clickable' : ''}`}
                onClick={onFollowingClick ? handleFollowingClick : undefined}
                style={{ cursor: onFollowingClick ? 'pointer' : 'default' }}
              >
                <div className="following-info">
                  <span className="following-id">
                    {usernames[follow.followingId] || follow.followingId}
                  </span>
                  <span className="following-date">
                    Följer sedan: {new Date(follow.createdAt).toLocaleDateString('sv-SE')}
                  </span>
                </div>
                {onFollowingClick && (
                  <span className="following-action-hint">Klicka för att avfölja</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default FollowingList;