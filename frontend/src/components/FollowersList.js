import React, { useState, useEffect, useCallback } from 'react';
import { followApi } from '../services/followApi';
import { userApi } from '../services/userApi';
import './FollowersList.css';

function FollowersList({ userId, onFollowerClick, refreshKey = 0 }) {
  const [followers, setFollowers] = useState([]);
  const [usernames, setUsernames] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getInitials = (name) => {
    if (!name) {
      return '?';
    }

    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
  };

  const fetchFollowers = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await followApi.getFollowers(userId);
      setFollowers(data);

      // Fetch usernames for all followers
      const usernameMap = {};
      await Promise.all(
        data.map(async (follow) => {
          try {
            const user = await userApi.getUserById(follow.followerId);
            if (user) {
              usernameMap[follow.followerId] = user.username;
            }
          } catch (err) {
            console.error(`Could not fetch user ${follow.followerId}:`, err);
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
  }, [fetchFollowers, refreshKey]);

  if (loading) {
    return (
      <div className="followers-list">
        <h3>Followers</h3>
        <div className="loading">Loading followers...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="followers-list">
        <h3>Followers</h3>
        <div className="error">Error: {error}</div>
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
        <div>
          <span className="followers-list-kicker">Audience</span>
          <h3>Followers ({followers.length})</h3>
        </div>
        <button
          onClick={fetchFollowers}
          className="refresh-button"
          disabled={loading}
          title="Refresh"
          aria-label="Refresh followers"
        >
          <span className={loading ? 'refresh-icon spinning' : 'refresh-icon'}>⟳</span>
        </button>
      </div>
      {followers.length === 0 ? (
        <div className="empty-message">No followers yet</div>
      ) : (
        <ul className="followers-list-items">
          {followers.map((follow) => (
            <li 
              key={follow.id} 
              className={`follower-item ${onFollowerClick ? 'follower-item-clickable' : ''}`}
              onClick={() => onFollowerClick && handleFollowerClick(follow.followerId)}
              style={{ cursor: onFollowerClick ? 'pointer' : 'default' }}
            >
              <div className="follower-main">
                <div className="follower-avatar" aria-hidden="true">
                  {getInitials(usernames[follow.followerId] || follow.followerId)}
                </div>
                <div className="follower-info">
                  <span className="follower-id">
                    {usernames[follow.followerId] || follow.followerId}
                  </span>
                  <span className="follower-date">
                    Following since {new Date(follow.createdAt).toLocaleDateString('en-US')}
                  </span>
                </div>
              </div>
              {onFollowerClick && (
                <span className="follower-action-hint">Open profile</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default FollowersList;