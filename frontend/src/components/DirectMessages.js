import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DirectMessagesList from './DirectMessagesList';
import SendDirectMessage from './SendDirectMessage';
import DirectMessageConversation from './DirectMessageConversation';
import './DirectMessages.css';

function DirectMessages({ userId }) {
  const navigate = useNavigate();
  const { userId: otherUserId } = useParams();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleConversationUpdated = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="direct-messages-container">
      <section className="direct-messages-intro">
        <span className="direct-messages-intro-badge">Messages</span>
        <h2 className="direct-messages-intro-title">All your direct messages in one place</h2>
        <p className="direct-messages-intro-text">
          Open an existing thread or start a new one without leaving the messages page.
        </p>
      </section>

      <div className="direct-messages-workspace">
        <aside className="direct-messages-sidebar">
          <DirectMessagesList key={refreshKey} userId={userId} />
        </aside>

        <section className="direct-messages-main">
          {otherUserId ? (
            <DirectMessageConversation
              userId={userId}
              otherUserId={otherUserId}
              onConversationUpdated={handleConversationUpdated}
            />
          ) : (
            <div className="direct-messages-home-panel">
              <div className="direct-messages-home-copy">
                <span className="direct-messages-home-badge">New message</span>
                <h3 className="direct-messages-home-title">Choose a chat or send a new DM</h3>
                <p className="direct-messages-home-text">
                  Your inbox stays on the left, and the active conversation opens here on the right.
                </p>
              </div>

              <div className="direct-messages-home-actions">
                <button
                  type="button"
                  className="direct-messages-home-shortcut"
                  onClick={() => navigate('/notifications')}
                >
                  Open notifications
                </button>
              </div>

              <SendDirectMessage senderId={userId} onMessageSent={handleConversationUpdated} />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default DirectMessages;
