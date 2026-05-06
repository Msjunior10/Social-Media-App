import React, { useState, useEffect } from 'react';
import { userApi } from '../services/userApi';
import { postsApi } from '../services/postsApi';
import { followApi } from '../services/followApi';
import './UserProfile.css';

function UserProfile({ userId, username, isEditable = false, refreshKey = 0 }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [stats, setStats] = useState({
    postsCount: 0,
    followersCount: 0,
    followingCount: 0,
  });
  const [formData, setFormData] = useState({
    bio: '',
    profileImageUrl: '',
  });

  const getInitials = (name) => {
    if (!name) {
      return '?';
    }

    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase())
      .join('');
  };

  const formatDateTime = (dateValue) => {
    if (!dateValue) {
      return 'Unknown';
    }

    return new Date(dateValue).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        setError(null);
        setSuccessMessage('');
        setIsEditing(false);
        let userData;
        
        if (userId) {
          userData = await userApi.getUserById(userId);
        } else if (username) {
          userData = await userApi.getUserByUsername(username);
        } else {
          setError('No user ID or username was provided');
          return;
        }

        if (!userData || !userData.id) {
          setUser(null);
          setStats({
            postsCount: 0,
            followersCount: 0,
            followingCount: 0,
          });
          setError('User not found');
          return;
        }

        const [posts, followers, following] = await Promise.all([
          postsApi.getTimelineByUserId(userData.id),
          followApi.getFollowers(userData.id),
          followApi.getFollowing(userData.id),
        ]);

        setUser(userData);
        setStats({
          postsCount: Array.isArray(posts) ? posts.length : 0,
          followersCount: Array.isArray(followers) ? followers.length : 0,
          followingCount: Array.isArray(following) ? following.length : 0,
        });
        setFormData({
          bio: userData.bio || '',
          profileImageUrl: userData.profileImageUrl || '',
        });
      } catch (err) {
        setError(err.message || 'Could not fetch user profile');
      } finally {
        setLoading(false);
      }
    };

    if (userId || username) {
      fetchUser();
    }
  }, [userId, username, refreshKey]);

  if (loading) {
    return <div className="user-profile-loading">Loading profile...</div>;
  }

  if (error && !user) {
    return <div className="user-profile-error">{error}</div>;
  }

  if (!user) {
    return <div className="user-profile-error">User not found</div>;
  }

  const profileChecklist = [
    {
      id: 'bio',
      label: 'Add a bio',
      done: Boolean(user.bio?.trim()),
    },
    {
      id: 'image',
      label: 'Add a profile image',
      done: Boolean(user.profileImageUrl?.trim()),
    },
    {
      id: 'first-post',
      label: 'Publish a first post',
      done: stats.postsCount > 0,
    },
    {
      id: 'network',
      label: 'Follow at least one person',
      done: stats.followingCount > 0,
    },
  ];

  const completedChecklistItems = profileChecklist.filter((item) => item.done).length;
  const completionPercent = Math.round((completedChecklistItems / profileChecklist.length) * 100);
  const joinedDaysAgo = user.createdAt
    ? Math.max(1, Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)))
    : null;
  const isPublicProfile = !isEditable;
  const publicProfileHighlight = (() => {
    if (stats.postsCount >= 8 && stats.followersCount >= 5) {
      return 'This profile is active and already building real momentum on Postra.';
    }

    if (stats.postsCount > 0) {
      return 'Posts are already live here, so this profile has started building a visible presence.';
    }

    return 'This profile is still getting started. Follow now to catch the first updates early.';
  })();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError(null);
    setSuccessMessage('');
    setFormData({
      bio: user.bio || '',
      profileImageUrl: user.profileImageUrl || '',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError(null);
      setSuccessMessage('');

      const updatedUser = await userApi.updateCurrentUserProfile({
        bio: formData.bio,
        profileImageUrl: formData.profileImageUrl.trim() || null,
      });

      setUser(updatedUser);
      setFormData({
        bio: updatedUser.bio || '',
        profileImageUrl: updatedUser.profileImageUrl || '',
      });
      setIsEditing(false);
      setSuccessMessage('Profile updated.');
    } catch (err) {
      setError(err.message || 'Could not update the profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="user-profile">
      <div className="user-profile-header user-profile-header-card">
        <div className="user-profile-avatar-wrapper">
          {user.profileImageUrl ? (
            <img
              src={user.profileImageUrl}
              alt={`${user.username} avatar`}
              className="user-profile-avatar-image"
            />
          ) : (
            <div className="user-profile-avatar-fallback">
              {getInitials(user.username)}
            </div>
          )}
        </div>

        <div className="user-profile-identity">
          <div className="user-profile-kicker">{isEditable ? 'My profile' : 'Public profile'}</div>
          <h3 className="user-profile-username">{user.username}</h3>
          {isEditable ? (
            <p className="user-profile-email">{user.email}</p>
          ) : (
            <p className="user-profile-public-badge">Open member profile on Postra</p>
          )}
          <p className="user-profile-last-active">
            Last active: {formatDateTime(user.lastActiveAt)}
          </p>
          <div className="user-profile-stat-row">
            <div className="user-profile-stat-pill">
              <strong>{stats.postsCount}</strong>
              <span>Posts</span>
            </div>
            <div className="user-profile-stat-pill">
              <strong>{stats.followersCount}</strong>
              <span>Followers</span>
            </div>
            <div className="user-profile-stat-pill">
              <strong>{stats.followingCount}</strong>
              <span>Following</span>
            </div>
          </div>
        </div>

        {isEditable && !isEditing && (
          <button
            type="button"
            className="user-profile-edit-button"
            onClick={() => {
              setIsEditing(true);
              setSuccessMessage('');
            }}
          >
            Edit profile
          </button>
        )}
      </div>

      {successMessage && (
        <div className="user-profile-success" role="status">
          {successMessage}
        </div>
      )}

      {error && user && (
        <div className="user-profile-error" role="alert">
          {error}
        </div>
      )}

      {isPublicProfile && (
        <div className="user-profile-public-spotlight">
          <div className="user-profile-public-copy">
            <span className="user-profile-label">Profile spotlight</span>
            <h4>{user.username}&apos;s public presence</h4>
            <p>{publicProfileHighlight}</p>
          </div>
          <div className="user-profile-public-grid">
            <div className="user-profile-public-card">
              <strong>{stats.postsCount}</strong>
              <span>Posts shared</span>
            </div>
            <div className="user-profile-public-card">
              <strong>{stats.followersCount}</strong>
              <span>Followers</span>
            </div>
            <div className="user-profile-public-card">
              <strong>{joinedDaysAgo || 0}</strong>
              <span>Days on Postra</span>
            </div>
          </div>
        </div>
      )}

      <div className="user-profile-details">
        {isEditable && (
          <div className="user-profile-detail user-profile-detail-column user-profile-detail-accent">
            <span className="user-profile-label">Profile strength:</span>
            <div className="user-profile-strength-header">
              <strong>{completionPercent}% complete</strong>
              <span>{completedChecklistItems}/{profileChecklist.length} milestones</span>
            </div>
            <div className="user-profile-strength-bar" aria-hidden="true">
              <span style={{ width: `${completionPercent}%` }}></span>
            </div>
          </div>
        )}
        {isEditable && (
          <div className="user-profile-detail">
            <span className="user-profile-label">Email:</span>
            <span className="user-profile-value">{user.email}</span>
          </div>
        )}
        <div className="user-profile-detail">
          <span className="user-profile-label">Member since:</span>
          <span className="user-profile-value">
            {new Date(user.createdAt).toLocaleDateString('en-US')}
          </span>
        </div>
        {joinedDaysAgo && (
          <div className="user-profile-detail">
            <span className="user-profile-label">Tenure:</span>
            <span className="user-profile-value">{joinedDaysAgo} day{joinedDaysAgo === 1 ? '' : 's'} on Postra</span>
          </div>
        )}
        <div className="user-profile-detail user-profile-detail-column">
          <span className="user-profile-label">Bio:</span>
          <span className="user-profile-value user-profile-bio">
            {user.bio || 'No bio yet.'}
          </span>
        </div>
        {isPublicProfile && (
          <div className="user-profile-detail user-profile-detail-column">
            <span className="user-profile-label">Audience snapshot:</span>
            <span className="user-profile-value">
              Following {stats.followingCount} account{stats.followingCount === 1 ? '' : 's'} and showing up with {stats.postsCount} public post{stats.postsCount === 1 ? '' : 's'} so far.
            </span>
          </div>
        )}
        {user.profileImageUrl && (
          <div className="user-profile-detail user-profile-detail-column">
            <span className="user-profile-label">Profile image:</span>
            <a
              className="user-profile-image-link"
              href={user.profileImageUrl}
              target="_blank"
              rel="noreferrer"
            >
              View image
            </a>
          </div>
        )}
      </div>

      {isEditable && (
        <div className="user-profile-checklist">
          <div className="user-profile-checklist-header">
            <h4>Recommended next steps</h4>
            <span>{completionPercent}% complete</span>
          </div>
          <div className="user-profile-checklist-items">
            {profileChecklist.map((item) => (
              <div key={item.id} className={`user-profile-checklist-item ${item.done ? 'done' : ''}`}>
                <span className="user-profile-checklist-icon" aria-hidden="true">{item.done ? '✓' : '○'}</span>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {isEditable && isEditing && (
        <form className="user-profile-form" onSubmit={handleSubmit}>
          <div className="user-profile-form-field">
            <label htmlFor="profileImageUrl">Profile image (URL)</label>
            <input
              id="profileImageUrl"
              name="profileImageUrl"
              type="url"
              value={formData.profileImageUrl}
              onChange={handleChange}
              placeholder="https://example.com/my-image.jpg"
            />
          </div>

          <div className="user-profile-form-field">
            <label htmlFor="bio">Bio</label>
            <textarea
              id="bio"
              name="bio"
              rows="5"
              maxLength="500"
              value={formData.bio}
              onChange={handleChange}
              placeholder="Tell us a little about yourself..."
            />
            <div className="user-profile-character-count">
              {formData.bio.length}/500 characters
            </div>
          </div>

          <div className="user-profile-form-actions">
            <button
              type="button"
              className="user-profile-secondary-button"
              onClick={handleCancel}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="user-profile-primary-button"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default UserProfile;
