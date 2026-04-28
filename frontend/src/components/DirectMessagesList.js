import React, { useState, useEffect, useCallback } from 'react';
import { dmApi } from '../services/dmApi';
import { userApi } from '../services/userApi';
import './DirectMessagesList.css';

function DirectMessagesList({ userId }) {
  const [messages, setMessages] = useState([]);
  const [usernames, setUsernames] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [markingAsRead, setMarkingAsRead] = useState(null);

  const fetchMessages = useCallback(async () => {
    if (!userId) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const receivedMessages = await dmApi.getReceivedMessages();
      // Sortera meddelanden så att nyaste kommer först
      const sortedMessages = receivedMessages.sort((a, b) => {
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      setMessages(sortedMessages);

      // Hämta användarnamn för alla unika avsändare
      const uniqueSenderIds = new Set();
      sortedMessages.forEach(msg => {
        if (msg.senderId) uniqueSenderIds.add(msg.senderId);
      });

      const usernameMap = {};
      await Promise.all(
        Array.from(uniqueSenderIds).map(async (id) => {
          try {
            const user = await userApi.getUserById(id);
            if (user) {
              usernameMap[id] = user.username;
            }
          } catch (err) {
            console.error(`Kunde inte hämta användare ${id}:`, err);
          }
        })
      );
      setUsernames(usernameMap);
    } catch (err) {
      setError(err.message || 'Kunde inte hämta meddelanden');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchMessages();
    }
  }, [userId, fetchMessages]);

  const handleMarkAsRead = async (messageId) => {
    try {
      setMarkingAsRead(messageId);
      await dmApi.markAsRead(messageId);
      
      // Uppdatera lokal state
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === messageId ? { ...msg, isRead: true } : msg
        )
      );
    } catch (err) {
      setError(err.message || 'Kunde inte markera meddelande som läst');
    } finally {
      setMarkingAsRead(null);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now - date;
    const diffInMinutes = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMs / 3600000);
    const diffInDays = Math.floor(diffInMs / 86400000);

    if (diffInMinutes < 1) {
      return 'Just nu';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} ${diffInMinutes === 1 ? 'minut' : 'minuter'} sedan`;
    } else if (diffInHours < 24) {
      return `${diffInHours} ${diffInHours === 1 ? 'timme' : 'timmar'} sedan`;
    } else if (diffInDays < 7) {
      return `${diffInDays} ${diffInDays === 1 ? 'dag' : 'dagar'} sedan`;
    } else {
      return date.toLocaleDateString('sv-SE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  if (loading) {
    return (
      <div className="dm-list-container">
        <h2 className="dm-list-title">Mottagna meddelanden</h2>
        <div className="dm-list-loading">Laddar meddelanden...</div>
      </div>
    );
  }

  return (
    <div className="dm-list-container">
      <div className="dm-list-header">
        <h2 className="dm-list-title">Mottagna meddelanden</h2>
        <button
          onClick={fetchMessages}
          className="dm-list-refresh-button"
          disabled={loading}
          title="Uppdatera"
          aria-label="Uppdatera meddelanden"
        >
          <span className={loading ? 'refresh-icon spinning' : 'refresh-icon'}>⟳</span>
        </button>
      </div>

      {error && (
        <div className="dm-list-error" role="alert">
          {error}
          <button
            onClick={fetchMessages}
            className="dm-list-retry-button"
          >
            Försök igen
          </button>
        </div>
      )}

      {messages.length === 0 && !loading && !error && (
        <div className="dm-list-empty">
          Du har inga mottagna meddelanden än.
        </div>
      )}

      {messages.length > 0 && (
        <div className="dm-list-messages">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`dm-message ${message.isRead ? 'dm-message-read' : 'dm-message-unread'}`}
            >
              <div className="dm-message-header">
                <div className="dm-message-sender">
                  Från: {usernames[message.senderId] || message.senderId}
                </div>
                <div className="dm-message-date">
                  {formatDate(message.createdAt)}
                </div>
              </div>
              <div className="dm-message-content">{message.message}</div>
              {!message.isRead && (
                <button
                  onClick={() => handleMarkAsRead(message.id)}
                  className="dm-message-mark-read"
                  disabled={markingAsRead === message.id}
                >
                  {markingAsRead === message.id ? 'Markerar...' : 'Markera som läst'}
                </button>
              )}
              {message.isRead && (
                <div className="dm-message-read-indicator">✓ Läst</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default DirectMessagesList;
