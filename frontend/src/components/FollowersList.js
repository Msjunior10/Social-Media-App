import React, { useState, useEffect, useCallback } from 'react';
import { followApi } from '../services/followApi';
import { userApi } from '../services/userApi';
import './FollowersList.css';

function FollowersList({ userId, onFollowerClick }) {
  const [followers, setFollowers] = useState([]);
  const [usernames, setUsernames] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchFollowers = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await followApi.getFollowers(userId);
      setFollowers(data);

      // Hämta användarnamn för alla följare
      const usernameMap = {};
      await Promise.all(
        data.map(async (follow) => {
          try {
            const user = await userApi.getUserById(follow.followerId);
            if (user) {
              usernameMap[follow.followerId] = user.username;
            }
          } catch (err) {
            console.error(`Kunde inte hämta användare ${follow.followerId}:`, err);
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
    fetchFollowers();
  }, [fetchFollowers]);

  if (loading) {
    return (
      <div className="followers-list">
        <h3>Följare</h3>
        <div className="loading">Laddar följare...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="followers-list">
        <h3>Följare</h3>
        <div className="error">Fel: {error}</div>
      </div>
    );
  }

  const handleFollowerClick = (followerId) => {
    if (onFollowerClick) {
      const followerUser = {
        id: followerId,
        username: usernames[followerId] || followerId
      };
      onFollowerClick(followerUser);
    }
  };

  return (
    <div className="followers-list">
      <div className="followers-list-header">
        <h3>Följare ({followers.length})</h3>
        <button
          onClick={fetchFollowers}
          className="refresh-button"
          disabled={loading}
          title="Uppdatera"
          aria-label="Uppdatera följare"
        >
          <span className={loading ? 'refresh-icon spinning' : 'refresh-icon'}>⟳</span>
        </button>
      </div>
      {followers.length === 0 ? (
        <div className="empty-message">Inga följare ännu</div>
      ) : (
        <ul className="followers-list-items">
          {followers.map((follow) => (
            <li 
              key={follow.id} 
              className={`follower-item ${onFollowerClick ? 'follower-item-clickable' : ''}`}
              onClick={() => onFollowerClick && handleFollowerClick(follow.followerId)}
              style={{ cursor: onFollowerClick ? 'pointer' : 'default' }}
            >
              <div className="follower-info">
                <span className="follower-id">
                  {usernames[follow.followerId] || follow.followerId}
                </span>
                <span className="follower-date">
                  Följer sedan: {new Date(follow.createdAt).toLocaleDateString('sv-SE')}
                </span>
              </div>
              {onFollowerClick && (
                <span className="follower-action-hint">Klicka för att följa tillbaka</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default FollowersList;