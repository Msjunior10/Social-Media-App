import * as signalR from '@microsoft/signalr';
import { getStoredAuth } from '../utils/apiClient';

const HUB_URL = 'http://localhost:5000/hubs/notifications';

let connection = null;
let startPromise = null;
const listeners = new Set();

const notifyListeners = (event) => {
  listeners.forEach((listener) => {
    try {
      listener(event);
    } catch {
      // Ignorera fel i enskilda lyssnare
    }
  });
};

const buildConnection = () => {
  const hubConnection = new signalR.HubConnectionBuilder()
    .withUrl(HUB_URL, {
      accessTokenFactory: () => getStoredAuth().token || '',
    })
    .withAutomaticReconnect()
    .build();

  hubConnection.on('notificationReceived', (payload) => {
    notifyListeners({
      type: 'notification-received',
      notification: payload?.notification ?? null,
      unreadCount: payload?.unreadCount ?? 0,
    });
  });

  hubConnection.on('notificationRead', (payload) => {
    notifyListeners({
      type: 'notification-read',
      notificationId: payload?.notificationId ?? null,
      unreadCount: payload?.unreadCount ?? 0,
    });
  });

  hubConnection.on('notificationsReadAll', (payload) => {
    notifyListeners({
      type: 'notifications-read-all',
      unreadCount: payload?.unreadCount ?? 0,
    });
  });

  hubConnection.onreconnected(() => {
    notifyListeners({ type: 'reconnected' });
  });

  hubConnection.onclose(() => {
    startPromise = null;
  });

  return hubConnection;
};

const ensureConnection = async () => {
  const token = getStoredAuth().token;
  if (!token) {
    return null;
  }

  if (!connection) {
    connection = buildConnection();
  }

  if (connection.state === signalR.HubConnectionState.Connected || connection.state === signalR.HubConnectionState.Connecting) {
    return connection;
  }

  if (!startPromise) {
    startPromise = connection.start()
      .catch(() => {
        connection = null;
        return null;
      })
      .finally(() => {
        startPromise = null;
      });
  }

  await startPromise;
  return connection;
};

export const notificationsRealtime = {
  async connect() {
    await ensureConnection();
  },

  async disconnect() {
    if (!connection) {
      return;
    }

    const activeConnection = connection;
    connection = null;
    startPromise = null;
    await activeConnection.stop();
  },

  subscribe(listener) {
    listeners.add(listener);
    ensureConnection();

    return () => {
      listeners.delete(listener);
    };
  },
};