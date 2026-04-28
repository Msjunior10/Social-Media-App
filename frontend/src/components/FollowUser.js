import React, { useState, useEffect } from 'react';
import { followApi } from '../services/followApi';
import { ApiError, ErrorCodes } from '../utils/ApiError';
import './FollowUser.css';

function FollowUser({ followerId, followingId, onFollowChange }) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(true);

  // Kontrollera om användaren redan följs
  useEffect(() => {
    const checkFollowStatus = async () => {
      try {
        setCheckingStatus(true);
        const following = await followApi.getFollowing(followerId);
        const isCurrentlyFollowing = following.some(
          (follow) => follow.followingId === followingId
        );
        setIsFollowing(isCurrentlyFollowing);
      } catch (err) {
        if (err instanceof ApiError) {
          switch (err.errorCode) {
            case ErrorCodes.TOKEN_EXPIRED:
              setError('Din session har gått ut. Logga in igen.');
              break;
            case ErrorCodes.NETWORK_ERROR:
              setError('Kunde inte ansluta till servern.');
              break;
            case ErrorCodes.TIMEOUT_ERROR:
              setError('Begäran tog för lång tid.');
              break;
            default:
              setError(err.message || 'Kunde inte kontrollera följstatus');
          }
        } else {
          setError(err.message || 'Kunde inte kontrollera följstatus');
        }
      } finally {
        setCheckingStatus(false);
      }
    };

    if (followerId && followingId) {
      checkFollowStatus();
    }
  }, [followerId, followingId]);

  const handleFollow = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Validera att followingId finns och är giltigt
      if (!followingId) {
        setError('Ogiltigt användar-ID.');
        setLoading(false);
        return;
      }
      
      await followApi.followUser(followingId);
      setIsFollowing(true);
      if (onFollowChange) {
        onFollowChange(true);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        switch (err.errorCode) {
          case ErrorCodes.TOKEN_EXPIRED:
            setError('Din session har gått ut. Logga in igen.');
            break;
          case ErrorCodes.NETWORK_ERROR:
            setError('Kunde inte ansluta till servern.');
            break;
          case ErrorCodes.TIMEOUT_ERROR:
            setError('Begäran tog för lång tid.');
            break;
          case ErrorCodes.ALREADY_FOLLOWING:
            // Om användaren redan följer, uppdatera ändå statusen och trigga refresh
            setIsFollowing(true);
            if (onFollowChange) {
              onFollowChange(true);
            }
            setError('Du följer redan denna användare.');
            break;
          case ErrorCodes.INVALID_USER_ID:
            setError('Ogiltigt användar-ID.');
            break;
          case ErrorCodes.INTERNAL_SERVER_ERROR:
            setError('Ett serverfel uppstod. Försök igen senare.');
            break;
          default:
            setError(err.message || 'Kunde inte följa användare');
        }
      } else {
        setError(err.message || 'Kunde inte följa användare');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUnfollow = async () => {
    try {
      setLoading(true);
      setError(null);
      await followApi.unfollowUser(followingId);
      setIsFollowing(false);
      if (onFollowChange) {
        onFollowChange(false);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        switch (err.errorCode) {
          case ErrorCodes.TOKEN_EXPIRED:
            setError('Din session har gått ut. Logga in igen.');
            break;
          case ErrorCodes.NETWORK_ERROR:
            setError('Kunde inte ansluta till servern.');
            break;
          case ErrorCodes.TIMEOUT_ERROR:
            setError('Begäran tog för lång tid.');
            break;
          case ErrorCodes.USER_NOT_FOUND:
            setError('Användaren kunde inte hittas.');
            break;
          default:
            setError(err.message || 'Kunde inte avfölja användare');
        }
      } else {
        setError(err.message || 'Kunde inte avfölja användare');
      }
    } finally {
      setLoading(false);
    }
  };

  // Validera att både followerId och followingId finns
  if (!followerId || !followingId) {
    return <div className="follow-user-error">Ogiltiga användar-ID:n</div>;
  }

  if (checkingStatus) {
    return <div className="follow-user-loading">Kontrollerar status...</div>;
  }

  return (
    <div className="follow-user">
      {error && <div className="follow-user-error">{error}</div>}
      {isFollowing ? (
        <button
          onClick={handleUnfollow}
          disabled={loading}
          className="follow-user-button unfollow-button"
        >
          {loading ? 'Avföljer...' : 'Avfölj'}
        </button>
      ) : (
        <button
          onClick={handleFollow}
          disabled={loading}
          className="follow-user-button follow-button"
        >
          {loading ? 'Följer...' : 'Följ'}
        </button>
      )}
    </div>
  );
}

export default FollowUser;