import React, { useState, useEffect } from 'react';
import { followApi } from '../services/followApi';
import { ApiError, ErrorCodes } from '../utils/ApiError';
import './FollowUser.css';

function FollowUser({ followerId, followingId, onFollowChange }) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(true);

  // Check if the user is already being followed
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
              setError('Your session has expired. Please sign in again.');
              break;
            case ErrorCodes.NETWORK_ERROR:
              setError('Could not connect to the server.');
              break;
            case ErrorCodes.TIMEOUT_ERROR:
              setError('The request took too long.');
              break;
            default:
              setError(err.message || 'Could not check follow status');
          }
        } else {
          setError(err.message || 'Could not check follow status');
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
      
      // Validate that followingId exists and is valid
      if (!followingId) {
        setError('Invalid user ID.');
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
            setError('Your session has expired. Please sign in again.');
            break;
          case ErrorCodes.NETWORK_ERROR:
            setError('Could not connect to the server.');
            break;
          case ErrorCodes.TIMEOUT_ERROR:
            setError('The request took too long.');
            break;
          case ErrorCodes.ALREADY_FOLLOWING:
            // If the user is already following, still update status and trigger refresh
            setIsFollowing(true);
            if (onFollowChange) {
              onFollowChange(true);
            }
            setError('You are already following this user.');
            break;
          case ErrorCodes.INVALID_USER_ID:
            setError('Invalid user ID.');
            break;
          case ErrorCodes.INTERNAL_SERVER_ERROR:
            setError('A server error occurred. Please try again later.');
            break;
          default:
            setError(err.message || 'Could not follow user');
        }
      } else {
        setError(err.message || 'Could not follow user');
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
            setError('Your session has expired. Please sign in again.');
            break;
          case ErrorCodes.NETWORK_ERROR:
            setError('Could not connect to the server.');
            break;
          case ErrorCodes.TIMEOUT_ERROR:
            setError('The request took too long.');
            break;
          case ErrorCodes.USER_NOT_FOUND:
            setError('The user could not be found.');
            break;
          default:
            setError(err.message || 'Could not unfollow user');
        }
      } else {
        setError(err.message || 'Could not unfollow user');
      }
    } finally {
      setLoading(false);
    }
  };

  // Validate that both followerId and followingId exist
  if (!followerId || !followingId) {
    return <div className="follow-user-error">Invalid user IDs</div>;
  }

  if (checkingStatus) {
    return <div className="follow-user-loading">Checking status...</div>;
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
          {loading ? 'Unfollowing...' : 'Unfollow'}
        </button>
      ) : (
        <button
          onClick={handleFollow}
          disabled={loading}
          className="follow-user-button follow-button"
        >
          {loading ? 'Following...' : 'Follow'}
        </button>
      )}
    </div>
  );
}

export default FollowUser;