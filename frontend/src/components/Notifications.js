import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationsApi } from '../services/notificationsApi';
import { ApiError, ErrorCodes } from '../utils/ApiError';
import './Notifications.css';

function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [error, setError] = useState(null);

  const getFriendlyError = (err) => {
    if (err instanceof ApiError) {
      switch (err.errorCode) {
        case ErrorCodes.TOKEN_EXPIRED:
          return 'Din session har gått ut. Logga in igen.';
        case ErrorCodes.NETWORK_ERROR:
          return 'Kunde inte ansluta till servern.';
        case ErrorCodes.TIMEOUT_ERROR:
          return 'Begäran tog för lång tid. Försök igen.';
        default:
          return err.message || 'Kunde inte hämta notiser.';
      }
    }

    return err?.message || 'Kunde inte hämta notiser.';
  };

  const notifyUpdated = () => {
    window.dispatchEvent(new Event('notifications-updated'));
  };

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await notificationsApi.getNotifications();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(getFriendlyError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const formatDate = (dateValue) => {
    return new Date(dateValue).toLocaleString('sv-SE', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const getNotificationTarget = (notification) => {
    switch (notification.type) {
      case 'direct_message':
        return '/messages';
      case 'follow':
        return `/users/${notification.actorId}`;
      case 'post_like':
      case 'post_comment':
        return '/profile';
      default:
        return '/timeline';
    }
  };

  const handleOpenNotification = async (notification) => {
    try {
      if (!notification.isRead) {
        await notificationsApi.markAsRead(notification.id);
        notifyUpdated();
        setNotifications((prev) => prev.map((item) => item.id === notification.id ? { ...item, isRead: true } : item));
      }
    } catch {
      // Navigera ändå även om markering misslyckas
    }

    navigate(getNotificationTarget(notification));
  };

  const handleMarkAllAsRead = async () => {
    try {
      setIsMarkingAll(true);
      setError(null);
      await notificationsApi.markAllAsRead();
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
      notifyUpdated();
    } catch (err) {
      setError(getFriendlyError(err));
    } finally {
      setIsMarkingAll(false);
    }
  };

  const unreadCount = notifications.filter((item) => !item.isRead).length;

  if (loading) {
    return (
      <div className="notifications-panel">
        <div className="notifications-loading">Laddar notiser...</div>
      </div>
    );
  }

  return (
    <div className="notifications-panel">
      <div className="notifications-header">
        <div>
          <h2 className="notifications-title">Notifikationer</h2>
          <p className="notifications-subtitle">Likes, kommentarer, följare och direktmeddelanden samlat på ett ställe.</p>
        </div>
        <button
          type="button"
          className="notifications-mark-all"
          onClick={handleMarkAllAsRead}
          disabled={isMarkingAll || unreadCount === 0}
        >
          {isMarkingAll ? 'Markerar...' : 'Markera alla som lästa'}
        </button>
      </div>

      {error && <div className="notifications-error">{error}</div>}

      {notifications.length === 0 ? (
        <div className="notifications-empty">
          <strong>Inga notiser ännu.</strong>
          <span>När någon interagerar med dig dyker det upp här.</span>
        </div>
      ) : (
        <div className="notifications-list">
          {notifications.map((notification) => (
            <button
              key={notification.id}
              type="button"
              className={`notifications-item ${notification.isRead ? 'read' : 'unread'}`}
              onClick={() => handleOpenNotification(notification)}
            >
              <div className="notifications-item-top">
                <span className="notifications-item-type">{notification.type.replace('_', ' ')}</span>
                <span className="notifications-item-date">{formatDate(notification.createdAt)}</span>
              </div>
              <div className="notifications-item-message">{notification.message}</div>
              {!notification.isRead && <span className="notifications-unread-pill">Ny</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default Notifications;
