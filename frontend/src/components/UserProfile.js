import React, { useState, useEffect } from 'react';
import { userApi } from '../services/userApi';
import './UserProfile.css';

function UserProfile({ userId, username, isEditable = false }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
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

        setUser(userData);
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
  }, [userId, username]);

  if (loading) {
    return <div className="user-profile-loading">Loading profile...</div>;
  }

  if (error && !user) {
    return <div className="user-profile-error">{error}</div>;
  }

  if (!user) {
    return <div className="user-profile-error">User not found</div>;
  }

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
          <h3 className="user-profile-username">{user.username}</h3>
          <p className="user-profile-email">{user.email}</p>
          <p className="user-profile-last-active">
            Last active: {formatDateTime(user.lastActiveAt)}
          </p>
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
        <div className="user-profile-detail">
          <span className="user-profile-label">Email:</span>
          <span className="user-profile-value">{user.email}</span>
        </div>
        <div className="user-profile-detail">
          <span className="user-profile-label">Member since:</span>
          <span className="user-profile-value">
            {new Date(user.createdAt).toLocaleDateString('en-US')}
          </span>
        </div>
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
