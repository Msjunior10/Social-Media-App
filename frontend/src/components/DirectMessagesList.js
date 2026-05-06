import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { dmApi } from '../services/dmApi';
import { userApi } from '../services/userApi';
import './DirectMessagesList.css';

function DirectMessagesList({ userId }) {
  const navigate = useNavigate();
  const { userId: activeConversationUserId } = useParams();
  const [messages, setMessages] = useState([]);
  const [usernames, setUsernames] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMessages = useCallback(async () => {
    if (!userId) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const inboxMessages = await dmApi.getInboxMessages();
      const sortedMessages = inboxMessages.sort((a, b) => {
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      setMessages(sortedMessages);

      const uniqueParticipantIds = new Set();
      sortedMessages.forEach(msg => {
        const otherParticipantId = msg.senderId === userId ? msg.recipientId : msg.senderId;
        if (otherParticipantId) {
          uniqueParticipantIds.add(otherParticipantId);
        }
      });

      const usernameMap = {};
      await Promise.all(
        Array.from(uniqueParticipantIds).map(async (id) => {
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

  const conversations = useMemo(() => {
    const groupedMessages = new Map();

    messages.forEach((message) => {
      const otherParticipantId = message.senderId === userId ? message.recipientId : message.senderId;
      const existingConversation = groupedMessages.get(otherParticipantId);

      if (!existingConversation) {
        groupedMessages.set(otherParticipantId, {
          otherParticipantId,
          latestMessage: message,
          unreadCount: message.recipientId === userId && !message.isRead ? 1 : 0,
        });
        return;
      }

      if (new Date(message.createdAt) > new Date(existingConversation.latestMessage.createdAt)) {
        existingConversation.latestMessage = message;
      }

      if (message.recipientId === userId && !message.isRead) {
        existingConversation.unreadCount += 1;
      }
    });

    return Array.from(groupedMessages.values())
      .sort((a, b) => new Date(b.latestMessage.createdAt) - new Date(a.latestMessage.createdAt));
  }, [messages, userId]);

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

  if (loading) {
    return (
      <div className="dm-list-container">
        <div className="dm-list-heading-block">
          <span className="dm-list-badge">All DMs</span>
          <h2 className="dm-list-title">Your chats</h2>
          <p className="dm-list-subtitle">Every direct message thread, collected in one place.</p>
        </div>
        <div className="dm-list-loading">Loading messages...</div>
      </div>
    );
  }

  return (
    <div className="dm-list-container">
      <div className="dm-list-header">
        <div className="dm-list-heading-block">
          <span className="dm-list-badge">All DMs</span>
          <h2 className="dm-list-title">Your chats</h2>
          <p className="dm-list-subtitle">Open any thread and keep the whole DM flow on this dedicated page.</p>
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

      {conversations.length === 0 && !loading && !error && (
        <div className="dm-list-empty">
          <strong>No messages yet.</strong>
          <span>When someone writes to you, everything will appear here in your inbox.</span>
        </div>
      )}

      {conversations.length > 0 && (
        <>
          <div className="dm-list-messages">
            {conversations.map((conversation) => {
              const { latestMessage, otherParticipantId, unreadCount } = conversation;
              const participantName = usernames[otherParticipantId] || otherParticipantId;
              const isActiveConversation = activeConversationUserId === otherParticipantId;
              const messagePrefix = latestMessage.senderId === userId ? 'You: ' : '';

              return (
                <button
                  key={otherParticipantId}
                  type="button"
                  className={`dm-message ${unreadCount > 0 ? 'dm-message-unread' : 'dm-message-read'} ${isActiveConversation ? 'dm-message-active' : ''}`}
                  onClick={() => navigate(`/messages/${otherParticipantId}`)}
                >
                  <div className="dm-message-header">
                    <div className="dm-message-sender-wrap">
                      <div className="dm-message-avatar" aria-hidden="true">{getInitials(participantName)}</div>
                      <div className="dm-message-sender">
                        <span className="dm-message-sender-label">Conversation</span>
                        <span className="dm-message-sender-name">{participantName}</span>
                      </div>
                    </div>
                    <div className="dm-message-date" title={new Date(latestMessage.createdAt).toLocaleString('en-US')}>
                      {formatDate(latestMessage.createdAt)}
                    </div>
                  </div>
                  <div className="dm-message-content">{messagePrefix}{latestMessage.message}</div>
                  <div className="dm-message-footer">
                    <div className="dm-message-open-thread">Open thread</div>
                    {unreadCount > 0 ? (
                      <div className="dm-message-unread-pill">{unreadCount} new</div>
                    ) : (
                      <div className="dm-message-read-indicator">Ready to reply</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default DirectMessagesList;
