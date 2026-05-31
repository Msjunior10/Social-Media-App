import * as signalR from '@microsoft/signalr';
import { getStoredAuth } from '../utils/apiClient';

const HUB_URL = 'http://localhost:5000/hubs/calls';

let connection = null;
let startPromise = null;
const listeners = new Set();
let connectionConsumerCount = 0;

const ACTIVE_CALL_ALREADY_EXISTS = 'A call is already active in this conversation.';

const notifyListeners = (event) => {
  listeners.forEach((listener) => {
    try {
      listener(event);
    } catch {
      // Ignore individual listener errors.
    }
  });
};

const createConnectionError = (fallbackMessage, originalError) => {
  const baseMessage = originalError?.message || fallbackMessage;
  return new Error(baseMessage);
};

const buildConnection = () => {
  const hubConnection = new signalR.HubConnectionBuilder()
    .withUrl(HUB_URL, {
      accessTokenFactory: () => getStoredAuth().token || '',
    })
    .withAutomaticReconnect()
    .build();

  hubConnection.on('callStarted', (payload) => {
    notifyListeners({ type: 'call-started', payload });
  });

  hubConnection.on('callEnded', (payload) => {
    notifyListeners({ type: 'call-ended', payload });
  });

  hubConnection.on('participantJoined', (payload) => {
    notifyListeners({ type: 'participant-joined', payload });
  });

  hubConnection.on('participantLeft', (payload) => {
    notifyListeners({ type: 'participant-left', payload });
  });

  hubConnection.on('offerReceived', (payload) => {
    notifyListeners({ type: 'offer-received', payload });
  });

  hubConnection.on('answerReceived', (payload) => {
    notifyListeners({ type: 'answer-received', payload });
  });

  hubConnection.on('iceCandidateReceived', (payload) => {
    notifyListeners({ type: 'ice-candidate-received', payload });
  });

  hubConnection.on('callInviteReceived', (payload) => {
    notifyListeners({ type: 'call-invite-received', payload });
  });

  hubConnection.on('callInviteResponded', (payload) => {
    notifyListeners({ type: 'call-invite-responded', payload });
  });

  hubConnection.onreconnected(() => {
    notifyListeners({ type: 'reconnected' });
  });

  hubConnection.onclose(() => {
    startPromise = null;
    notifyListeners({ type: 'disconnected' });
  });

  return hubConnection;
};

const ensureConnection = async () => {
  const token = getStoredAuth().token;
  if (!token) {
    throw new Error('Signaling requires an authenticated session. Please sign in again.');
  }

  if (!connection) {
    connection = buildConnection();
  }

  if (connection.state === signalR.HubConnectionState.Connected) {
    return connection;
  }

  if (connection.state === signalR.HubConnectionState.Connecting && startPromise) {
    return await startPromise;
  }

  if (!startPromise) {
    startPromise = connection.start()
      .then(() => {
        notifyListeners({ type: 'connected' });
        return connection;
      })
      .catch((error) => {
        connection = null;
        throw createConnectionError('Could not connect to call signaling.', error);
      })
      .finally(() => {
        startPromise = null;
      });
  }

  return await startPromise;
};

const invoke = async (methodName, ...args) => {
  const activeConnection = await ensureConnection();
  if (!activeConnection || activeConnection.state !== signalR.HubConnectionState.Connected) {
    throw new Error('Call signaling is currently unavailable. Try again in a moment.');
  }

  await activeConnection.invoke(methodName, ...args);
};

export const callSignalingRealtime = {
  async connect() {
    connectionConsumerCount += 1;
    await ensureConnection();
  },

  async disconnect() {
    connectionConsumerCount = Math.max(0, connectionConsumerCount - 1);

    if (connectionConsumerCount > 0 || !connection) {
      return;
    }

    const activeConnection = connection;
    connection = null;
    startPromise = null;
    await activeConnection.stop();
  },

  subscribe(listener) {
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  },

  async joinConversation(conversationId) {
    await invoke('JoinConversation', conversationId);
  },

  async leaveConversation(conversationId) {
    await invoke('LeaveConversation', conversationId);
  },

  async startCall(conversationId, callType) {
    try {
      await invoke('StartCall', conversationId, callType);
    } catch (error) {
      const message = error?.message || '';
      if (!message.includes(ACTIVE_CALL_ALREADY_EXISTS)) {
        throw error;
      }

      // Recover from an orphaned active call (e.g. prior disconnect/crash) and retry once.
      await invoke('EndCall', conversationId);
      await invoke('StartCall', conversationId, callType);
    }
  },

  async endCall(conversationId) {
    await invoke('EndCall', conversationId);
  },

  async sendCallInvite(conversationId, targetUserId, callType) {
    await invoke('SendCallInvite', conversationId, targetUserId, callType);
  },

  async respondToCallInvite(conversationId, targetUserId, accepted, callType) {
    await invoke('RespondToCallInvite', conversationId, targetUserId, accepted, callType);
  },

  async sendOffer(conversationId, targetUserId, sdp) {
    await invoke('SendOffer', conversationId, targetUserId, sdp);
  },

  async sendAnswer(conversationId, targetUserId, sdp) {
    await invoke('SendAnswer', conversationId, targetUserId, sdp);
  },

  async sendIceCandidate(conversationId, targetUserId, candidate, sdpMid = null, sdpMLineIndex = null) {
    await invoke('SendIceCandidate', conversationId, targetUserId, candidate, sdpMid, sdpMLineIndex);
  },
};
