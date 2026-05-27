import React, { useEffect, useMemo, useState } from 'react';
import { conversationApi } from '../services/conversationApi';
import { userApi } from '../services/userApi';
import './GroupConversations.css';

function GroupConversations({ currentUserId }) {
  const [conversations, setConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState('');
  const [messages, setMessages] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [newConversationTitle, setNewConversationTitle] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId) || null,
    [conversations, selectedConversationId]
  );

  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      try {
        setError('');
        setLoadingConversations(true);

        const [fetchedConversations, fetchedUsers] = await Promise.all([
          conversationApi.getMyConversations(),
          userApi.getAllUsers(),
        ]);

        if (!isMounted) {
          return;
        }

        const normalizedConversations = Array.isArray(fetchedConversations) ? fetchedConversations : [];
        setConversations(normalizedConversations);

        if (normalizedConversations.length > 0) {
          setSelectedConversationId((previousSelectedId) => previousSelectedId || normalizedConversations[0].id);
        }

        const normalizedUsers = Array.isArray(fetchedUsers) ? fetchedUsers : [];
        setAvailableUsers(normalizedUsers.filter((user) => user.id !== currentUserId));
      } catch (loadError) {
        if (isMounted) {
          setError(loadError?.message || 'Could not load group conversations.');
        }
      } finally {
        if (isMounted) {
          setLoadingConversations(false);
        }
      }
    };

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, [currentUserId]);

  useEffect(() => {
    let isMounted = true;

    const loadMessages = async () => {
      if (!selectedConversationId) {
        setMessages([]);
        return;
      }

      try {
        setError('');
        setLoadingMessages(true);
        const fetchedMessages = await conversationApi.getMessages(selectedConversationId);

        if (isMounted) {
          setMessages(Array.isArray(fetchedMessages) ? fetchedMessages : []);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError?.message || 'Could not load conversation messages.');
        }
      } finally {
        if (isMounted) {
          setLoadingMessages(false);
        }
      }
    };

    loadMessages();

    return () => {
      isMounted = false;
    };
  }, [selectedConversationId]);

  const toggleMember = (memberId) => {
    setSelectedMemberIds((previousIds) => {
      if (previousIds.includes(memberId)) {
        return previousIds.filter((id) => id !== memberId);
      }

      return [...previousIds, memberId];
    });
  };

  const handleCreateConversation = async (event) => {
    event.preventDefault();

    try {
      setError('');
      setIsCreating(true);

      const createdConversation = await conversationApi.createConversation(newConversationTitle, selectedMemberIds);
      const nextConversations = [createdConversation, ...conversations.filter((item) => item.id !== createdConversation.id)];
      setConversations(nextConversations);
      setSelectedConversationId(createdConversation.id);
      setNewConversationTitle('');
      setSelectedMemberIds([]);
    } catch (createError) {
      setError(createError?.message || 'Could not create group conversation.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSendMessage = async (event) => {
    event.preventDefault();

    if (!selectedConversationId || !newMessage.trim()) {
      return;
    }

    try {
      setError('');
      setIsSending(true);

      const createdMessage = await conversationApi.sendMessage(selectedConversationId, newMessage.trim());
      setMessages((previousMessages) => [...previousMessages, createdMessage]);
      setNewMessage('');
    } catch (sendError) {
      setError(sendError?.message || 'Could not send message to the group conversation.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="group-conversations-layout">
      <section className="group-conversations-column">
        <div className="group-conversations-card">
          <h3 className="group-conversations-title">Group conversations</h3>
          <p className="group-conversations-subtitle">Create a group and start messaging in this MVP version.</p>

          {loadingConversations ? (
            <p className="group-conversations-empty">Loading conversations...</p>
          ) : conversations.length === 0 ? (
            <p className="group-conversations-empty">No group conversations yet.</p>
          ) : (
            <ul className="group-conversations-list">
              {conversations.map((conversation) => (
                <li key={conversation.id}>
                  <button
                    type="button"
                    className={`group-conversation-item ${selectedConversationId === conversation.id ? 'active' : ''}`}
                    onClick={() => setSelectedConversationId(conversation.id)}
                  >
                    <span className="group-conversation-item-title">{conversation.title}</span>
                    <span className="group-conversation-item-meta">{conversation.members?.length || 0} members</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <form className="group-conversations-card" onSubmit={handleCreateConversation}>
          <h4 className="group-conversations-create-title">Create group</h4>

          <label className="group-conversations-label" htmlFor="group-conversation-title">
            Title
          </label>
          <input
            id="group-conversation-title"
            type="text"
            value={newConversationTitle}
            onChange={(event) => setNewConversationTitle(event.target.value)}
            placeholder="Example: Team Alpha"
            className="group-conversations-input"
            maxLength={120}
            required
          />

          <p className="group-conversations-helper">Pick at least one person for the group conversation.</p>
          <div className="group-conversations-members">
            {availableUsers.map((user) => (
              <label key={user.id} className="group-conversations-member-option">
                <input
                  type="checkbox"
                  checked={selectedMemberIds.includes(user.id)}
                  onChange={() => toggleMember(user.id)}
                />
                <span>{user.username}</span>
              </label>
            ))}
          </div>

          <button
            type="submit"
            className="group-conversations-primary-btn"
            disabled={isCreating || selectedMemberIds.length === 0 || !newConversationTitle.trim()}
          >
            {isCreating ? 'Creating...' : 'Create group'}
          </button>
        </form>
      </section>

      <section className="group-conversations-card group-conversations-chat">
        <h3 className="group-conversations-title">{selectedConversation?.title || 'Select a conversation'}</h3>
        {selectedConversation && (
          <p className="group-conversations-subtitle">
            Members: {(selectedConversation.members || []).map((member) => member.username).join(', ')}
          </p>
        )}

        {error && <p className="group-conversations-error">{error}</p>}

        <div className="group-conversations-messages">
          {!selectedConversation ? (
            <p className="group-conversations-empty">Select or create a group conversation to start messaging.</p>
          ) : loadingMessages ? (
            <p className="group-conversations-empty">Loading messages...</p>
          ) : messages.length === 0 ? (
            <p className="group-conversations-empty">No messages yet. Start the conversation.</p>
          ) : (
            <ul className="group-conversations-message-list">
              {messages.map((message) => (
                <li key={message.id} className={`group-conversations-message-item ${message.senderId === currentUserId ? 'own' : ''}`}>
                  <div className="group-conversations-message-meta">
                    <span>{message.senderUsername || 'Unknown user'}</span>
                    <span>{new Date(message.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="group-conversations-message-text">{message.message}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <form className="group-conversations-send-form" onSubmit={handleSendMessage}>
          <input
            type="text"
            value={newMessage}
            onChange={(event) => setNewMessage(event.target.value)}
            placeholder="Write a group message..."
            className="group-conversations-input"
            disabled={!selectedConversationId || isSending}
          />
          <button
            type="submit"
            className="group-conversations-primary-btn"
            disabled={!selectedConversationId || !newMessage.trim() || isSending}
          >
            {isSending ? 'Sending...' : 'Send'}
          </button>
        </form>
      </section>
    </div>
  );
}

export default GroupConversations;
