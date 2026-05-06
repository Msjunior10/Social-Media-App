import React, { useState, useEffect, useCallback } from 'react';
import { followApi } from '../services/followApi';
import { userApi } from '../services/userApi';
import './FollowingList.css';

function FollowingList({ userId, onFollowingClick, refreshKey = 0 }) {
  const [following, setFollowing] = useState([]);
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

  const fetchFollowing = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await followApi.getFollowing(userId);
      setFollowing(data);

      // Fetch usernames for all followed users
      const usernameMap = {};
      await Promise.all(
        data.map(async (follow) => {
          try {
            const user = await userApi.getUserById(follow.followingId);
            if (user) {
              usernameMap[follow.followingId] = user.username;
            }
          } catch (err) {
            console.error(`Could not fetch user ${follow.followingId}:`, err);
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
  }, [fetchFollowing, refreshKey]);

  if (loading) {
    return (
      <div className="following-list">
        <h3>Following</h3>
        <div className="loading">Loading followed users...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="following-list">
        <h3>Following</h3>
        <div className="error">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="following-list">
      <div className="following-list-header">
        <div>
          <span className="following-list-kicker">Connections</span>
          <h3>Following ({following.length})</h3>
        </div>
        <button
          onClick={fetchFollowing}
          className="refresh-button"
          disabled={loading}
          title="Refresh"
          aria-label="Refresh followed users"
        >
          <span className={loading ? 'refresh-icon spinning' : 'refresh-icon'}>⟳</span>
        </button>
      </div>
      {following.length === 0 ? (
        <div className="empty-message">Not following any users yet</div>
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
                <div className="following-main">
                  <div className="following-avatar" aria-hidden="true">
                    {getInitials(usernames[follow.followingId] || follow.followingId)}
                  </div>
                  <div className="following-info">
                    <span className="following-id">
                      {usernames[follow.followingId] || follow.followingId}
                    </span>
                    <span className="following-date">
                      Following since {new Date(follow.createdAt).toLocaleDateString('en-US')}
                    </span>
                  </div>
                </div>
                {onFollowingClick && (
                  <span className="following-action-hint">Open profile</span>
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