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
      return 'Okänd';
    }

    return new Date(dateValue).toLocaleString('sv-SE', {
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
          setError('Inget användar-ID eller användarnamn angivet');
          return;
        }

        setUser(userData);
        setFormData({
          bio: userData.bio || '',
          profileImageUrl: userData.profileImageUrl || '',
        });
      } catch (err) {
        setError(err.message || 'Kunde inte hämta användarprofil');
      } finally {
        setLoading(false);
      }
    };

    if (userId || username) {
      fetchUser();
    }
  }, [userId, username]);

  if (loading) {
    return <div className="user-profile-loading">Laddar profil...</div>;
  }

  if (error && !user) {
    return <div className="user-profile-error">{error}</div>;
  }

  if (!user) {
    return <div className="user-profile-error">Användare hittades inte</div>;
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
      setSuccessMessage('Profilen uppdaterades.');
    } catch (err) {
      setError(err.message || 'Kunde inte uppdatera profilen');
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
              alt={`Profilbild för ${user.username}`}
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
            Senast aktiv: {formatDateTime(user.lastActiveAt)}
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
            Redigera profil
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
          <span className="user-profile-label">E-post:</span>
          <span className="user-profile-value">{user.email}</span>
        </div>
        <div className="user-profile-detail">
          <span className="user-profile-label">Medlem sedan:</span>
          <span className="user-profile-value">
            {new Date(user.createdAt).toLocaleDateString('sv-SE')}
          </span>
        </div>
        <div className="user-profile-detail user-profile-detail-column">
          <span className="user-profile-label">Bio:</span>
          <span className="user-profile-value user-profile-bio">
            {user.bio || 'Ingen bio ännu.'}
          </span>
        </div>
        {user.profileImageUrl && (
          <div className="user-profile-detail user-profile-detail-column">
            <span className="user-profile-label">Profilbild:</span>
            <a
              className="user-profile-image-link"
              href={user.profileImageUrl}
              target="_blank"
              rel="noreferrer"
            >
              Visa bild
            </a>
          </div>
        )}
      </div>

      {isEditable && isEditing && (
        <form className="user-profile-form" onSubmit={handleSubmit}>
          <div className="user-profile-form-field">
            <label htmlFor="profileImageUrl">Profilbild (URL)</label>
            <input
              id="profileImageUrl"
              name="profileImageUrl"
              type="url"
              value={formData.profileImageUrl}
              onChange={handleChange}
              placeholder="https://example.com/min-bild.jpg"
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
              placeholder="Berätta lite om dig själv..."
            />
            <div className="user-profile-character-count">
              {formData.bio.length}/500 tecken
            </div>
          </div>

          <div className="user-profile-form-actions">
            <button
              type="button"
              className="user-profile-secondary-button"
              onClick={handleCancel}
              disabled={saving}
            >
              Avbryt
            </button>
            <button
              type="submit"
              className="user-profile-primary-button"
              disabled={saving}
            >
              {saving ? 'Sparar...' : 'Spara ändringar'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default UserProfile;
