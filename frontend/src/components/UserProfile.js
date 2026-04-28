import React, { useState, useEffect } from 'react';
import { userApi } from '../services/userApi';
import './UserProfile.css';

function UserProfile({ userId, username }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        setError(null);
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

  if (error) {
    return <div className="user-profile-error">{error}</div>;
  }

  if (!user) {
    return <div className="user-profile-error">Användare hittades inte</div>;
  }

  return (
    <div className="user-profile">
      <div className="user-profile-header">
        <h3 className="user-profile-username">{user.username}</h3>
      </div>
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
      </div>
    </div>
  );
}

export default UserProfile;
