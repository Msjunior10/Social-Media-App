import React, { useState, useEffect, useRef } from 'react';
import { userApi } from '../services/userApi';
import './UserSearch.css';

function UserSearch({ onUserSelect, placeholder = 'Search for users...', excludeUserId = null }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState([]);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState(null);
  const searchTimeoutRef = useRef(null);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Close dropdown when clicking outside
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

  // Search users with debounce
  useEffect(() => {
    let isMounted = true;

    const fetchSuggestedUsers = async () => {
      try {
        const allUsers = await userApi.getAllUsers();
        if (!isMounted) {
          return;
        }

        const filteredUsers = (Array.isArray(allUsers) ? allUsers : [])
          .filter((user) => !excludeUserId || user.id !== excludeUserId)
          .slice(0, 6);

        setSuggestedUsers(filteredUsers);
      } catch {
        if (isMounted) {
          setSuggestedUsers([]);
        }
      }
    };

    fetchSuggestedUsers();

    return () => {
      isMounted = false;
    };
  }, [excludeUserId]);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchTerm.trim().length < 2) {
      setUsers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await userApi.searchUsers(searchTerm.trim());
        // Filter out excludeUserId if set
        const filteredResults = excludeUserId
          ? results.filter(user => user.id !== excludeUserId)
          : results;
        setUsers(filteredResults);
        setShowDropdown(true);
      } catch (err) {
        setError('Could not search for users');
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
    if ((users.length > 0 && searchTerm.trim().length >= 2) || (searchTerm.trim().length < 2 && suggestedUsers.length > 0)) {
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

  const usersToRender = searchTerm.trim().length >= 2 ? users : suggestedUsers;
  const dropdownTitle = searchTerm.trim().length >= 2 ? 'Search results' : 'Suggested people';

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
            aria-label="Clear selection"
          >
            ×
          </button>
        )}
        {loading && (
          <span className="user-search-loading">Searching...</span>
        )}
      </div>

      {error && (
        <div className="user-search-error" role="alert">
          {error}
        </div>
      )}

      <div className="user-search-helper-text">
        {selectedUser
          ? `Selected: ${selectedUser.username}`
          : searchTerm.trim().length >= 2
            ? `${users.length} result${users.length === 1 ? '' : 's'} for “${searchTerm.trim()}”`
            : 'Type at least 2 characters or choose someone from the suggestions below.'}
      </div>

      {showDropdown && (
        <div ref={dropdownRef} className="user-search-dropdown">
          <div className="user-search-dropdown-header">{dropdownTitle}</div>
          {usersToRender.length === 0 ? (
            <div className="user-search-no-results">
              {loading ? 'Searching...' : searchTerm.trim().length >= 2 ? 'No users found' : 'No suggestions available'}
            </div>
          ) : (
            <ul className="user-search-list">
              {usersToRender.map((user) => (
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
                  <div className="user-search-avatar">
                    {getInitials(user.username)}
                  </div>
                  <div className="user-search-meta">
                    <span className="user-search-username">{user.username}</span>
                    {user.email && (
                      <span className="user-search-email">{user.email}</span>
                    )}
                  </div>
                  <span className="user-search-action">Open</span>
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
