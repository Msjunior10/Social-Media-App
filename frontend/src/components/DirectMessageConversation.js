import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dmApi } from '../services/dmApi';
import { userApi } from '../services/userApi';
import './DirectMessageConversation.css';

const MAX_MEDIA_SIZE_BYTES = 25 * 1024 * 1024;
const ALLOWED_MEDIA_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/ogg',
];

function DirectMessageConversation({ userId, otherUserId, onConversationUpdated }) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [otherUser, setOtherUser] = useState(null);
  const [draft, setDraft] = useState('');
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!selectedMedia) {
      setMediaPreviewUrl('');
      return undefined;
    }

    const previewUrl = URL.createObjectURL(selectedMedia);
    setMediaPreviewUrl(previewUrl);

    return () => URL.revokeObjectURL(previewUrl);
  }, [selectedMedia]);

  const isVideoPreview = Boolean(selectedMedia?.type?.startsWith('video/'));

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
    if (!trimmedDraft && !selectedMedia) {
      return;
    }

    try {
      setSending(true);
      setError(null);
      const createdMessage = await dmApi.sendDirectMessage(otherUserId, trimmedDraft, selectedMedia);
      setMessages((previousMessages) => [...previousMessages, createdMessage]);
      setDraft('');
      setSelectedMedia(null);
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

  const isVideoUrl = (url) => {
    if (!url) {
      return false;
    }

    try {
      const parsedUrl = new URL(url, window.location.origin);
      return /\.(mp4|webm|ogg)$/i.test(parsedUrl.pathname);
    } catch {
      return /\.(mp4|webm|ogg)(\?.*)?$/i.test(url);
    }
  };

  const handleMediaChange = (event) => {
    const file = event.target.files?.[0] || null;

    if (!file) {
      setSelectedMedia(null);
      return;
    }

    if (!ALLOWED_MEDIA_TYPES.includes(file.type)) {
      setError('Only JPG, PNG, GIF, WEBP, MP4, WEBM, and OGG files are allowed.');
      setSelectedMedia(null);
      return;
    }

    if (file.size > MAX_MEDIA_SIZE_BYTES) {
      setError('The media file cannot be larger than 25 MB.');
      setSelectedMedia(null);
      return;
    }

    setError(null);
    setSelectedMedia(file);
  };

  const handleRemoveMedia = () => setSelectedMedia(null);

  const getDownloadName = (message) => {
    const resolvedUrl = dmApi.resolveMediaUrl(message.mediaUrl);

    try {
      const parsedUrl = new URL(resolvedUrl);
      return parsedUrl.pathname.split('/').pop() || 'direct-message-file';
    } catch {
      return 'direct-message-file';
    }
  };

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
                const resolvedMediaUrl = dmApi.resolveMediaUrl(message.mediaUrl);

                return (
                  <article
                    key={message.id}
                    className={`dm-bubble ${isOwnMessage ? 'dm-bubble-own' : 'dm-bubble-incoming'}`}
                  >
                    {resolvedMediaUrl && (
                      <div className="dm-bubble-media-wrap">
                        {isVideoUrl(resolvedMediaUrl) ? (
                          <video src={resolvedMediaUrl} className="dm-bubble-media" controls preload="metadata" />
                        ) : (
                          <img src={resolvedMediaUrl} alt="Shared direct message media" className="dm-bubble-media" />
                        )}
                        <div className="dm-bubble-media-actions">
                          <a
                            href={resolvedMediaUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="dm-bubble-media-link"
                          >
                            Open
                          </a>
                          <a
                            href={resolvedMediaUrl}
                            download={getDownloadName(message)}
                            className="dm-bubble-media-link"
                          >
                            Download
                          </a>
                        </div>
                      </div>
                    )}
                    {message.message && <div className="dm-bubble-body">{message.message}</div>}
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
            <input
              id="dm-reply-media"
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/ogg"
              onChange={handleMediaChange}
              className="dm-conversation-file-input"
              disabled={sending}
            />
            {selectedMedia && (
              <div className="dm-conversation-preview">
                {mediaPreviewUrl && (isVideoPreview ? (
                  <video src={mediaPreviewUrl} className="dm-conversation-preview-media" controls muted />
                ) : (
                  <img src={mediaPreviewUrl} alt="Selected conversation media preview" className="dm-conversation-preview-media" />
                ))}
                <div className="dm-conversation-preview-meta">
                  <span>{selectedMedia.name}</span>
                  <button type="button" className="dm-conversation-remove-media" onClick={handleRemoveMedia} disabled={sending}>Remove file</button>
                </div>
              </div>
            )}
            <div className="dm-conversation-form-footer">
              <span className="dm-conversation-counter">{draft.length} / 500</span>
              <button
                type="submit"
                className="dm-conversation-submit"
                disabled={sending || (!draft.trim() && !selectedMedia)}
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