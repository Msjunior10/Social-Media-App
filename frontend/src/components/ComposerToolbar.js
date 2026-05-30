import React, { useDeferredValue, useEffect, useRef, useState } from 'react';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { gifApi } from '../services/gifApi';
import './ComposerToolbar.css';

function ComposerToolbar({ disabled = false, onEmojiSelect, onGifSelect, className = '', children = null }) {
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isGifPickerOpen, setIsGifPickerOpen] = useState(false);
  const [gifQuery, setGifQuery] = useState('');
  const deferredGifQuery = useDeferredValue(gifQuery.trim());
  const [gifResults, setGifResults] = useState([]);
  const [gifTopics, setGifTopics] = useState([]);
  const [isGifLoading, setIsGifLoading] = useState(false);
  const [gifError, setGifError] = useState('');
  const rootRef = useRef(null);
  const safeGifTopics = Array.isArray(gifTopics) ? gifTopics : [];
  const safeGifResults = Array.isArray(gifResults) ? gifResults : [];

  useEffect(() => {
    if (!isEmojiPickerOpen && !isGifPickerOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setIsEmojiPickerOpen(false);
        setIsGifPickerOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isEmojiPickerOpen, isGifPickerOpen]);

  useEffect(() => {
    if (!isGifPickerOpen) {
      return undefined;
    }

    let isCancelled = false;

    const loadTopics = async () => {
      if (!gifApi.isConfigured()) {
        return;
      }

      try {
        const topics = await gifApi.getTrendingSearchTerms();
        if (!isCancelled) {
          setGifTopics(topics);
        }
      } catch {
        if (!isCancelled) {
          setGifTopics([]);
        }
      }
    };

    loadTopics();
    return () => {
      isCancelled = true;
    };
  }, [isGifPickerOpen]);

  useEffect(() => {
    if (!isGifPickerOpen) {
      return undefined;
    }

    if (!gifApi.isConfigured()) {
      setGifResults([]);
      setGifError('GIF search is not configured right now.');
      setIsGifLoading(false);
      return undefined;
    }

    let isCancelled = false;
    const timeoutId = window.setTimeout(async () => {
      try {
        setIsGifLoading(true);
        setGifError('');
        const results = deferredGifQuery
          ? await gifApi.search(deferredGifQuery, 18)
          : await gifApi.getTrending(18);

        if (!isCancelled) {
          setGifResults(results);
        }
      } catch (error) {
        if (!isCancelled) {
          setGifResults([]);
          setGifError(error.message || 'Could not load GIFs right now.');
        }
      } finally {
        if (!isCancelled) {
          setIsGifLoading(false);
        }
      }
    }, deferredGifQuery ? 220 : 0);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [deferredGifQuery, isGifPickerOpen]);

  return (
    <div ref={rootRef} className={`composer-toolbar ${className}`.trim()}>
      <button
        type="button"
        className="composer-toolbar-button"
        onClick={() => setIsEmojiPickerOpen((value) => !value)}
        disabled={disabled}
        aria-expanded={isEmojiPickerOpen}
        aria-label="Open emoji picker"
      >
        <span aria-hidden="true">😊</span>
        <span>Emoji</span>
      </button>

      <button
        type="button"
        className="composer-toolbar-button"
        onClick={() => {
          setIsEmojiPickerOpen(false);
          setIsGifPickerOpen((value) => !value);
        }}
        disabled={disabled}
        aria-expanded={isGifPickerOpen}
        aria-label="Open GIF picker"
      >
        <span>GIF</span>
      </button>

      {children}

      {isEmojiPickerOpen && (
        <div className="composer-emoji-panel" role="dialog" aria-label="Emoji picker">
          <EmojiPicker
            onEmojiClick={(emojiData) => {
              onEmojiSelect?.(emojiData.emoji);
              setIsEmojiPickerOpen(false);
            }}
            theme={document.documentElement.dataset.theme === 'dark' ? Theme.DARK : Theme.LIGHT}
            width="100%"
            height="min(360px, calc(100vh - 140px))"
            searchPlaceHolder="Search all emojis"
            previewConfig={{ showPreview: false }}
            skinTonesDisabled={false}
            lazyLoadEmojis
          />
        </div>
      )}

      {isGifPickerOpen && (
        <div className="composer-gif-panel" role="dialog" aria-label="GIF picker">
          <div className="composer-gif-header">
            <label className="composer-gif-search-shell" htmlFor="composer-gif-search">
              <span className="composer-gif-search-prefix">GIF</span>
              <input
                id="composer-gif-search"
                type="search"
                className="composer-gif-search-input"
                value={gifQuery}
                onChange={(event) => setGifQuery(event.target.value)}
                placeholder="Search famous GIFs..."
                disabled={disabled}
              />
            </label>
          </div>

          {safeGifTopics.length > 0 && (
            <div className="composer-gif-topics">
              {safeGifTopics.map((topic) => (
                <button
                  key={topic}
                  type="button"
                  className="composer-gif-topic"
                  onClick={() => setGifQuery(topic)}
                  disabled={disabled}
                >
                  {topic}
                </button>
              ))}
            </div>
          )}

          <div className="composer-gif-results" aria-live="polite">
            {isGifLoading ? (
              <div className="composer-gif-state">Loading GIFs...</div>
            ) : gifError ? (
              <div className="composer-gif-state composer-gif-state-error">{gifError}</div>
            ) : safeGifResults.length === 0 ? (
              <div className="composer-gif-state">No GIFs matched that search.</div>
            ) : (
              <div className="composer-gif-grid">
                {safeGifResults.map((gif) => (
                  <button
                    key={gif.id}
                    type="button"
                    className="composer-gif-card"
                    onClick={() => {
                      onGifSelect?.(gif);
                      setIsGifPickerOpen(false);
                    }}
                    disabled={disabled}
                    title={gif.title}
                  >
                    <img src={gif.previewUrl} alt={gif.altText} className="composer-gif-card-image" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="composer-gif-attribution">Powered by GIPHY</div>
        </div>
      )}
    </div>
  );
}

export default ComposerToolbar;