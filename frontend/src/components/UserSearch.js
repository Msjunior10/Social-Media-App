import React, { useState, useEffect, useRef } from 'react';
import { userApi } from '../services/userApi';
import './UserSearch.css';

function UserSearch({ onUserSelect, placeholder = 'Sök efter användare...', excludeUserId = null }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState(null);
  const searchTimeoutRef = useRef(null);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Stäng dropdown när man klickar utanför
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        inputRef.current &&
        !inputRef.current.contains(event.target)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Sök efter användare med debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchTerm.trim().length < 2) {
      setUsers([]);
      setShowDropdown(false);
      return;
    }

    setLoading(true);
    setError(null);

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await userApi.searchUsers(searchTerm.trim());
        // Filtrera bort excludeUserId om den är satt
        const filteredResults = excludeUserId
          ? results.filter(user => user.id !== excludeUserId)
          : results;
        setUsers(filteredResults);
        setShowDropdown(true);
      } catch (err) {
        setError('Kunde inte söka efter användare');
        setUsers([]);
        setShowDropdown(false);
      } finally {
        setLoading(false);
      }
    }, 300); // 300ms debounce

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm, excludeUserId]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setSelectedUser(null);
    if (onUserSelect) {
      onUserSelect(null);
    }
  };

  const handleUserClick = (user) => {
    setSelectedUser(user);
    setSearchTerm(user.username);
    setShowDropdown(false);
    if (onUserSelect) {
      onUserSelect(user);
    }
  };

  const handleInputFocus = () => {
    if (users.length > 0 && searchTerm.trim().length >= 2) {
      setShowDropdown(true);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  const handleClear = () => {
    setSearchTerm('');
    setSelectedUser(null);
    setUsers([]);
    setShowDropdown(false);
    if (onUserSelect) {
      onUserSelect(null);
    }
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div className="user-search-container">
      <div className="user-search-input-wrapper">
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="user-search-input"
          autoComplete="off"
        />
        {selectedUser && (
          <button
            type="button"
            onClick={handleClear}
            className="user-search-clear"
            aria-label="Rensa val"
          >
            ×
          </button>
        )}
        {loading && (
          <span className="user-search-loading">Söker...</span>
        )}
      </div>

      {error && (
        <div className="user-search-error" role="alert">
          {error}
        </div>
      )}

      {showDropdown && (
        <div ref={dropdownRef} className="user-search-dropdown">
          {users.length === 0 ? (
            <div className="user-search-no-results">
              {loading ? 'Söker...' : 'Inga användare hittades'}
            </div>
          ) : (
            <ul className="user-search-list">
              {users.map((user) => (
                <li
                  key={user.id}
                  className={`user-search-item ${
                    selectedUser?.id === user.id ? 'selected' : ''
                  }`}
                  onClick={() => handleUserClick(user)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleUserClick(user);
                    }
                  }}
                  tabIndex={0}
                  role="option"
                  aria-selected={selectedUser?.id === user.id}
                >
                  <span className="user-search-username">{user.username}</span>
                  {user.email && (
                    <span className="user-search-email">{user.email}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {selectedUser && (
        <input
          type="hidden"
          name="recipientId"
          value={selectedUser.id}
        />
      )}
    </div>
  );
}

export default UserSearch;
