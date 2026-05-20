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
    email: '',
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
        
        if (isEditable) {
          userData = await userApi.getCurrentUser();
        } else if (userId) {
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
          email: userData.email || '',
          bio: userData.bio || '',
          profileImageUrl: userData.profileImageUrl || '',
        });
      } catch (err) {
        setError(err.message || 'Could not fetch user profile');
      } finally {
        setLoading(false);
      }
    };

    if (isEditable || userId || username) {
      fetchUser();
    }
  }, [userId, username, isEditable, refreshKey]);

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
  const joinedDaysAgo = user.createdAt
    ? Math.max(1, Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)))
    : null;
  const profileHandle = `@${String(user.username || '').toLowerCase().replace(/\s+/g, '')}`;

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
      email: user.email || '',
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
        email: formData.email.trim(),
        bio: formData.bio,
        profileImageUrl: formData.profileImageUrl.trim() || null,
      });

      setUser(updatedUser);
      setFormData({
        email: updatedUser.email || '',
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
          <div className="user-profile-handle-row">
            <span className="user-profile-handle">{profileHandle}</span>
            {isEditable && <span className="user-profile-account-pill">Editable account</span>}
          </div>
          {isEditable && user.email && <p className="user-profile-email">{user.email}</p>}
          {!isEditable && <p className="user-profile-public-badge">Member profile</p>}
          {user.lastActiveAt && (
            <p className="user-profile-last-active">
              Last active: {formatDateTime(user.lastActiveAt)}
            </p>
          )}
          <p className="user-profile-summary">
            {user.bio?.trim()
              ? user.bio
              : isEditable
                ? 'Add a short bio and profile image to make your profile feel complete.'
                : 'No bio has been added yet.'}
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

      <div className="user-profile-details">
        {isEditable && (
          <div className="user-profile-detail user-profile-detail-email">
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
            <h4>Complete your profile</h4>
            <span>{completedChecklistItems}/{profileChecklist.length}</span>
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
          <div className="user-profile-form-section">
            <div className="user-profile-form-section-header">
              <h4>Contact and identity</h4>
              <p>Keep your profile reachable and consistent with the rest of the app.</p>
            </div>
            <div className="user-profile-form-grid">
              <div className="user-profile-form-field">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@example.com"
                  autoComplete="email"
                />
              </div>

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
            </div>
          </div>

          <div className="user-profile-form-section">
            <div className="user-profile-form-section-header">
              <h4>Presentation</h4>
              <p>Make the profile feel complete and more professional.</p>
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
