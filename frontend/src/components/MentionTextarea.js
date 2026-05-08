import React, { useEffect, useRef, useState } from 'react';
import { userApi } from '../services/userApi';
import './MentionTextarea.css';

const HighlightedText = ({ value }) => {
  const segments = String(value ?? '').split(/(@[A-Za-z0-9_]{3,50})/g);

  return segments.map((segment, index) => {
    if (/^@[A-Za-z0-9_]{3,50}$/.test(segment)) {
      return (
        <span key={`mention-${index}`} className="mention-text-highlight">
          {segment}
        </span>
      );
    }

    return <span key={`text-${index}`}>{segment}</span>;
  });
};

function getMentionContext(value, caretPosition) {
  const safeValue = value ?? '';
  const prefix = safeValue.slice(0, caretPosition);
  const match = prefix.match(/(^|\s)@([A-Za-z0-9_]*)$/);

  if (!match) {
    return null;
  }

  const query = match[2] ?? '';
  const mentionStart = prefix.length - query.length - 1;

  return {
    query,
    start: mentionStart,
    end: caretPosition,
  };
}

function MentionTextarea({
  value,
  onChange,
  className,
  placeholder,
  rows = 4,
  disabled = false,
  maxLength,
  onBlur,
  id,
  name,
  excludeUserId = null,
  overlayClassName = '',
}) {
  const textareaRef = useRef(null);
  const overlayRef = useRef(null);
  const blurTimeoutRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const [mentionContext, setMentionContext] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [fallbackUsers, setFallbackUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        window.clearTimeout(blurTimeoutRef.current);
      }

      if (searchTimeoutRef.current) {
        window.clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!mentionContext) {
      setSuggestions([]);
      setShowSuggestions(false);
      setLoading(false);
      return undefined;
    }

    if (searchTimeoutRef.current) {
      window.clearTimeout(searchTimeoutRef.current);
    }

    const loadFallbackUsers = async () => {
      try {
        const users = await userApi.getAllUsers();
        const filteredUsers = (Array.isArray(users) ? users : [])
          .filter((user) => !excludeUserId || user.id !== excludeUserId)
          .slice(0, 6);

        setFallbackUsers(filteredUsers);
        setSuggestions(filteredUsers);
        setShowSuggestions(filteredUsers.length > 0);
      } catch {
        setFallbackUsers([]);
        setSuggestions([]);
        setShowSuggestions(false);
      }
    };

    if (mentionContext.query.length < 2) {
      if (fallbackUsers.length > 0) {
        const filteredFallback = fallbackUsers.filter((user) => (
          mentionContext.query.length === 0
            ? true
            : user.username?.toLowerCase().startsWith(mentionContext.query.toLowerCase())
        ));
        setSuggestions(filteredFallback.slice(0, 6));
        setShowSuggestions(filteredFallback.length > 0);
      } else {
        loadFallbackUsers();
      }

      setLoading(false);
      return undefined;
    }

    setLoading(true);
    searchTimeoutRef.current = window.setTimeout(async () => {
      try {
        const results = await userApi.searchUsers(mentionContext.query);
        const filteredResults = (Array.isArray(results) ? results : [])
          .filter((user) => !excludeUserId || user.id !== excludeUserId)
          .slice(0, 6);
        setSuggestions(filteredResults);
        setShowSuggestions(filteredResults.length > 0);
      } catch {
        setSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => {
      if (searchTimeoutRef.current) {
        window.clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [excludeUserId, fallbackUsers, mentionContext]);

  const updateMentionState = (nextValue, caretPosition) => {
    const context = getMentionContext(nextValue, caretPosition);
    setMentionContext(context);
    setShowSuggestions(Boolean(context));
  };

  const handleChange = (event) => {
    onChange(event);
    updateMentionState(event.target.value, event.target.selectionStart ?? event.target.value.length);
  };

  const handleFocus = (event) => {
    updateMentionState(value, event.target.selectionStart ?? value.length);
  };

  const handleSelect = (user) => {
    if (!textareaRef.current || !mentionContext) {
      return;
    }

    const nextValue = `${value.slice(0, mentionContext.start)}@${user.username} ${value.slice(mentionContext.end)}`;
    onChange({ target: { value: nextValue } });
    setShowSuggestions(false);
    setMentionContext(null);

    window.requestAnimationFrame(() => {
      if (!textareaRef.current) {
        return;
      }

      const nextCaretPosition = mentionContext.start + user.username.length + 2;
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(nextCaretPosition, nextCaretPosition);
    });
  };

  const handleBlur = (event) => {
    blurTimeoutRef.current = window.setTimeout(() => {
      setShowSuggestions(false);
      setMentionContext(null);
    }, 120);

    onBlur?.(event);
  };

  const syncScroll = (element) => {
    if (!overlayRef.current || !element) {
      return;
    }

    overlayRef.current.scrollTop = element.scrollTop;
    overlayRef.current.scrollLeft = element.scrollLeft;
  };

  const renderSuggestionSubtitle = (user) => {
    if (user.bio) {
      return user.bio;
    }

    return `@${user.username}`;
  };

  return (
    <div className="mention-textarea-shell">
      <div
        ref={overlayRef}
        className={`mention-textarea-overlay ${overlayClassName}`.trim()}
        aria-hidden="true"
      >
        <div className="mention-textarea-overlay-content">
          <HighlightedText value={value} />
          <span className="mention-textarea-overlay-trailing-space"> </span>
        </div>
      </div>

      <textarea
        ref={textareaRef}
        id={id}
        name={name}
        value={value}
        onChange={handleChange}
        onClick={(event) => updateMentionState(event.target.value, event.target.selectionStart ?? event.target.value.length)}
        onKeyUp={(event) => updateMentionState(event.target.value, event.target.selectionStart ?? event.target.value.length)}
        onScroll={(event) => syncScroll(event.target)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={`${className} mention-textarea-input`.trim()}
        rows={rows}
        disabled={disabled}
        maxLength={maxLength}
      />

      {showSuggestions && (
        <div className="mention-suggestions-panel" role="listbox" aria-label="Mention suggestions">
          <div className="mention-suggestions-header">
            <span>Mention someone</span>
            {loading ? <span>Searching...</span> : <span>{mentionContext?.query?.length >= 2 ? 'Matches' : 'Suggested users'}</span>}
          </div>
          <div className="mention-suggestions-list">
            {suggestions.length === 0 && !loading ? (
              <div className="mention-suggestions-empty">No matching users found.</div>
            ) : (
              suggestions.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  className="mention-suggestion-item"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    handleSelect(user);
                  }}
                >
                  <span className="mention-suggestion-avatar" aria-hidden="true">
                    {String(user.username || '?').charAt(0).toUpperCase()}
                  </span>
                  <span className="mention-suggestion-copy">
                    <span className="mention-suggestion-name">{user.username}</span>
                    <span className="mention-suggestion-meta">{renderSuggestionSubtitle(user)}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default MentionTextarea;