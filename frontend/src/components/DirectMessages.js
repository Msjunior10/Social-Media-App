import React, { useState } from 'react';
import DirectMessagesList from './DirectMessagesList';
import SendDirectMessage from './SendDirectMessage';
import './DirectMessages.css';

function DirectMessages({ userId }) {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleMessageSent = () => {
    // Update key to trigger rerender of DirectMessagesList
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="direct-messages-container">
      <section className="direct-messages-intro">
        <span className="direct-messages-intro-badge">Inbox</span>
        <h2 className="direct-messages-intro-title">Private conversations with the same feel as the rest of the app</h2>
        <p className="direct-messages-intro-text">
          Write directly, keep track of incoming messages, and manage your inbox in a more
          curated flow.
        </p>
      </section>

      <div className="direct-messages-grid">
        <SendDirectMessage senderId={userId} onMessageSent={handleMessageSent} />
        <DirectMessagesList key={refreshKey} userId={userId} />
      </div>
    </div>
  );
}

export default DirectMessages;
