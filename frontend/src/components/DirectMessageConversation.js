import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dmApi } from '../services/dmApi';
import { userApi } from '../services/userApi';
import './DirectMessageConversation.css';

function DirectMessageConversation({ userId, otherUserId, onConversationUpdated }) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [otherUser, setOtherUser] = useState(null);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const fetchConversation = useCallback(async () => {
    if (!userId || !otherUserId) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [conversation, user] = await Promise.all([
        dmApi.getConversation(otherUserId),
        userApi.getUserById(otherUserId),
      ]);

      const sortedConversation = Array.isArray(conversation)
        ? [...conversation].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        : [];

      setMessages(sortedConversation);
      setOtherUser(user);

      const unreadIncomingMessages = sortedConversation.filter((message) => (
        message.recipientId === userId && message.senderId === otherUserId && !message.isRead
      ));

      if (unreadIncomingMessages.length > 0) {
        await Promise.all(unreadIncomingMessages.map((message) => dmApi.markAsRead(message.id)));

        setMessages((previousMessages) => previousMessages.map((message) => (
          unreadIncomingMessages.some((item) => item.id === message.id)
            ? { ...message, isRead: true }
            : message
        )));

        onConversationUpdated?.();
      }
    } catch (err) {
      setError(err.message || 'Could not load the conversation.');
    } finally {
      setLoading(false);
    }
  }, [otherUserId, onConversationUpdated, userId]);

  useEffect(() => {
    fetchConversation();
  }, [fetchConversation]);

  const latestActivity = useMemo(() => {
    if (messages.length === 0) {
      return 'No messages yet';
    }

    return new Date(messages[messages.length - 1].createdAt).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [messages]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedDraft = draft.trim();
    if (!trimmedDraft) {
      return;
    }

    try {
      setSending(true);
      setError(null);
      const createdMessage = await dmApi.sendDirectMessage(otherUserId, trimmedDraft);
      setMessages((previousMessages) => [...previousMessages, createdMessage]);
      setDraft('');
      onConversationUpdated?.();
    } catch (err) {
      setError(err.message || 'Could not send the message.');
    } finally {
      setSending(false);
    }
  };

  const formatBubbleDate = (value) => new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const conversationTitle = otherUser?.username || 'Conversation';

  return (
    <section className="dm-conversation-shell">
      <header className="dm-conversation-header">
        <div>
          <span className="dm-conversation-badge">Chat</span>
          <h2 className="dm-conversation-title">{conversationTitle}</h2>
          <p className="dm-conversation-subtitle">
            Reply directly in the thread instead of starting over from search.
          </p>
        </div>
        <div className="dm-conversation-actions">
          <div className="dm-conversation-meta">Latest activity {latestActivity}</div>
          <button
            type="button"
            className="dm-conversation-secondary"
            onClick={() => navigate('/messages')}
          >
            New message
          </button>
        </div>
      </header>

      {error && <div className="dm-conversation-error" role="alert">{error}</div>}

      {loading ? (
        <div className="dm-conversation-loading">Loading conversation...</div>
      ) : (
        <>
          <div className="dm-conversation-stream">
            {messages.length === 0 ? (
              <div className="dm-conversation-empty">
                <strong>No messages in this chat yet.</strong>
                <span>Send the first reply and keep the whole exchange in one place.</span>
              </div>
            ) : (
              messages.map((message) => {
                const isOwnMessage = message.senderId === userId;

                return (
                  <article
                    key={message.id}
                    className={`dm-bubble ${isOwnMessage ? 'dm-bubble-own' : 'dm-bubble-incoming'}`}
                  >
                    <div className="dm-bubble-body">{message.message}</div>
                    <div className="dm-bubble-meta">
                      <span>{isOwnMessage ? 'You' : conversationTitle}</span>
                      <span>{formatBubbleDate(message.createdAt)}</span>
                    </div>
                  </article>
                );
              })
            )}
          </div>

          <form className="dm-conversation-form" onSubmit={handleSubmit}>
            <label className="dm-conversation-label" htmlFor="dm-reply-message">Reply</label>
            <textarea
              id="dm-reply-message"
              className="dm-conversation-input"
              placeholder={`Write back to ${conversationTitle}...`}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows="4"
              maxLength="500"
              disabled={sending}
            />
            <div className="dm-conversation-form-footer">
              <span className="dm-conversation-counter">{draft.length} / 500</span>
              <button
                type="submit"
                className="dm-conversation-submit"
                disabled={sending || !draft.trim()}
              >
                {sending ? 'Sending...' : 'Send reply'}
              </button>
            </div>
          </form>
        </>
      )}
    </section>
  );
}

export default DirectMessageConversation;