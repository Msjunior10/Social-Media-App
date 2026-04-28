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
      <SendDirectMessage senderId={userId} onMessageSent={handleMessageSent} />
      <DirectMessagesList key={refreshKey} userId={userId} />
    </div>
  );
}

export default DirectMessages;
