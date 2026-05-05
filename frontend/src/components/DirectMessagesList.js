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
      // Sort messages so the newest appears first
      const sortedMessages = receivedMessages.sort((a, b) => {
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      setMessages(sortedMessages);

      // Fetch usernames for all unique senders
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
            console.error(`Could not fetch user ${id}:`, err);
          }
        })
      );
      setUsernames(usernameMap);
    } catch (err) {
      setError(err.message || 'Could not fetch messages');
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
      
      // Update local state
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === messageId ? { ...msg, isRead: true } : msg
        )
      );
    } catch (err) {
      setError(err.message || 'Could not mark message as read');
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
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
    } else if (diffInDays < 7) {
      return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
    } else {
      return date.toLocaleDateString('en-US', {
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
        <div className="dm-list-heading-block">
          <span className="dm-list-badge">Inbox</span>
          <h2 className="dm-list-title">Received messages</h2>
          <p className="dm-list-subtitle">See the latest messages, mark them as read, and keep track of your private inbox.</p>
        </div>
        <div className="dm-list-loading">Loading messages...</div>
      </div>
    );
  }

  return (
    <div className="dm-list-container">
      <div className="dm-list-header">
        <div className="dm-list-heading-block">
          <span className="dm-list-badge">Inbox</span>
          <h2 className="dm-list-title">Received messages</h2>
          <p className="dm-list-subtitle">A clearer message flow that fits the rest of Socially.</p>
        </div>
        <button
          onClick={fetchMessages}
          className="dm-list-refresh-button"
          disabled={loading}
          title="Refresh"
          aria-label="Refresh messages"
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
            Try again
          </button>
        </div>
      )}

      {messages.length === 0 && !loading && !error && (
        <div className="dm-list-empty">
          <strong>No messages yet.</strong>
          <span> When someone writes to you, everything will appear here in your inbox.</span>
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
                  <span className="dm-message-sender-label">From</span>
                  <span className="dm-message-sender-name">{usernames[message.senderId] || message.senderId}</span>
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
                  {markingAsRead === message.id ? 'Marking...' : 'Mark as read'}
                </button>
              )}
              {message.isRead && (
                <div className="dm-message-read-indicator">✓ Read</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default DirectMessagesList;
