import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { userApi } from '../services/userApi';
import { followApi } from '../services/followApi';
import { wallApi } from '../services/wallApi';
import { ApiError, ErrorCodes } from '../utils/ApiError';
import './NetworkSuggestions.css';

function NetworkSuggestions({ userId, refreshKey = 0, onFollowChange }) {
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [summary, setSummary] = useState({
    suggestedCount: 0,
    activeProfiles: 0,
    followingCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingUserId, setPendingUserId] = useState(null);

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

  const fetchSuggestions = useCallback(async () => {
    if (!userId) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [wallPosts, allUsers, following] = await Promise.all([
        wallApi.getWall(),
        userApi.getAllUsers(),
        followApi.getFollowing(userId),
      ]);

      const normalizedUsers = Array.isArray(allUsers) ? allUsers : [];
      const normalizedPosts = Array.isArray(wallPosts) ? wallPosts : [];
      const normalizedFollowing = Array.isArray(following) ? following : [];
      const followedIds = new Set(normalizedFollowing.map((entry) => entry.followingId));
      const activeAuthorIds = normalizedPosts
        .map((post) => post.senderId)
        .filter((id, index, array) => Boolean(id) && array.indexOf(id) === index);

      const userMap = new Map(normalizedUsers.map((user) => [user.id, user]));
      const prioritizedSuggestions = [
        ...activeAuthorIds
          .map((id) => userMap.get(id))
          .filter((user) => user && user.id !== userId && !followedIds.has(user.id)),
        ...normalizedUsers.filter((user) => user.id !== userId && !followedIds.has(user.id)),
      ];

      const seen = new Set();
      const uniqueSuggestions = prioritizedSuggestions.filter((user) => {
        if (!user || seen.has(user.id)) {
          return false;
        }

        seen.add(user.id);
        return true;
      }).slice(0, 4);

      setSuggestedUsers(uniqueSuggestions);
      setSummary({
        suggestedCount: uniqueSuggestions.length,
        activeProfiles: activeAuthorIds.length,
        followingCount: normalizedFollowing.length,
      });
    } catch (err) {
      setError(err.message || 'Could not load suggested people');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions, refreshKey]);

  const handleFollowUser = async (event, suggestedUserId) => {
    event.preventDefault();
    event.stopPropagation();

    try {
      setPendingUserId(suggestedUserId);
      setError(null);
      await followApi.followUser(suggestedUserId);

      setSuggestedUsers((currentUsers) => currentUsers.filter((user) => user.id !== suggestedUserId));
      setSummary((currentSummary) => ({
        ...currentSummary,
        suggestedCount: Math.max(0, currentSummary.suggestedCount - 1),
        followingCount: currentSummary.followingCount + 1,
      }));

      if (onFollowChange) {
        onFollowChange();
      }
    } catch (err) {
      if (err instanceof ApiError) {
        switch (err.errorCode) {
          case ErrorCodes.ALREADY_FOLLOWING:
            setSuggestedUsers((currentUsers) => currentUsers.filter((user) => user.id !== suggestedUserId));
            setSummary((currentSummary) => ({
              ...currentSummary,
              suggestedCount: Math.max(0, currentSummary.suggestedCount - 1),
            }));
            if (onFollowChange) {
              onFollowChange();
            }
            break;
          case ErrorCodes.TOKEN_EXPIRED:
            setError('Your session has expired. Please sign in again.');
            break;
          case ErrorCodes.NETWORK_ERROR:
            setError('Could not connect to the server.');
            break;
          case ErrorCodes.TIMEOUT_ERROR:
            setError('The request took too long.');
            break;
          default:
            setError(err.message || 'Could not follow this user');
        }
      } else {
        setError(err.message || 'Could not follow this user');
      }
    } finally {
      setPendingUserId(null);
    }
  };

  if (!userId) {
    return null;
  }

  return (
    <section className="network-suggestions">
      <div className="network-suggestions-header">
        <div>
          <span className="network-suggestions-label">Suggested people</span>
          <h3>Suggested people to explore</h3>
          <p>Profiles you are not following yet, prioritised from visible activity in the feed.</p>
        </div>
        <button
          type="button"
          className="network-suggestions-refresh"
          onClick={fetchSuggestions}
          disabled={loading}
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <div className="network-suggestions-summary">
        <div className="network-suggestions-summary-card">
          <strong>{loading ? '…' : summary.suggestedCount}</strong>
          <span>Ready to explore</span>
        </div>
        <div className="network-suggestions-summary-card">
          <strong>{loading ? '…' : summary.activeProfiles}</strong>
          <span>Active profiles</span>
        </div>
        <div className="network-suggestions-summary-card">
          <strong>{loading ? '…' : summary.followingCount}</strong>
          <span>You follow</span>
        </div>
      </div>

      {error && <div className="network-suggestions-error">{error}</div>}

      {!error && suggestedUsers.length === 0 && !loading ? (
        <div className="network-suggestions-empty">
          You are already connected with the most active people right now. Try searching for more profiles above.
        </div>
      ) : (
        <div className="network-suggestions-grid">
          {suggestedUsers.map((user) => (
            <Link key={user.id} to={`/users/${user.id}`} className="network-suggestion-card">
              <div className="network-suggestion-main">
                <div className="network-suggestion-avatar">
                  {user.profileImageUrl ? (
                    <img src={user.profileImageUrl} alt={`${user.username} avatar`} className="network-suggestion-avatar-image" />
                  ) : (
                    <span>{getInitials(user.username)}</span>
                  )}
                </div>
                <div className="network-suggestion-meta">
                  <strong>{user.username}</strong>
                  <span>{user.bio?.trim() ? user.bio : 'Open this profile to see posts and decide if you want to follow.'}</span>
                </div>
              </div>
              <div className="network-suggestion-actions">
                <button
                  type="button"
                  className="network-suggestion-follow-button"
                  onClick={(event) => handleFollowUser(event, user.id)}
                  disabled={pendingUserId === user.id}
                >
                  {pendingUserId === user.id ? 'Following…' : 'Follow'}
                </button>
                <span className="network-suggestion-action">Open profile</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

export default NetworkSuggestions;
