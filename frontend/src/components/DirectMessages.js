import React, { useState } from 'react';
import DirectMessagesList from './DirectMessagesList';
import SendDirectMessage from './SendDirectMessage';
import './DirectMessages.css';

function DirectMessages({ userId }) {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleMessageSent = () => {
    // Uppdatera nyckel för att trigga omrendering av DirectMessagesList
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="direct-messages-container">
      <section className="direct-messages-intro">
        <span className="direct-messages-intro-badge">Inbox</span>
        <h2 className="direct-messages-intro-title">Privata konversationer med samma känsla som resten av appen</h2>
        <p className="direct-messages-intro-text">
          Skriv direkt, håll koll på inkommande meddelanden och hantera din inbox i ett mer
          kuraterat flöde.
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
