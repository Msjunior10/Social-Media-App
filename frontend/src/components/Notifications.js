import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationsApi } from '../services/notificationsApi';
import { notificationsRealtime } from '../services/notificationsRealtime';
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
          return 'Your session has expired. Please sign in again.';
        case ErrorCodes.NETWORK_ERROR:
          return 'Could not connect to the server.';
        case ErrorCodes.TIMEOUT_ERROR:
          return 'The request took too long. Please try again.';
        default:
          return err.message || 'Could not fetch notifications.';
      }
    }

    return err?.message || 'Could not fetch notifications.';
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

  useEffect(() => {
    const unsubscribe = notificationsRealtime.subscribe((event) => {
      switch (event.type) {
        case 'notification-received':
          if (!event.notification) {
            return;
          }

          setNotifications((prev) => {
            const exists = prev.some((item) => item.id === event.notification.id);
            if (exists) {
              return prev;
            }

            return [event.notification, ...prev];
          });
          break;
        case 'notification-read':
          if (!event.notificationId) {
            return;
          }

          setNotifications((prev) => prev.map((item) => (
            item.id === event.notificationId
              ? { ...item, isRead: true }
              : item
          )));
          break;
        case 'notifications-read-all':
          setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
          break;
        case 'reconnected':
          fetchNotifications();
          break;
        default:
          break;
      }
    });

    return () => unsubscribe();
  }, [fetchNotifications]);

  const formatDate = (dateValue) => {
    return new Date(dateValue).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const getPostNotificationTarget = (notification) => {
    if (!notification.postId) {
      return '/profile';
    }

    const searchParams = new URLSearchParams({
      postId: notification.postId,
      notificationType: notification.type,
    });

    if (notification.type === 'post_comment') {
      searchParams.set('openComments', '1');
    }

    return `/profile?${searchParams.toString()}`;
  };

  const getNotificationTarget = (notification) => {
    switch (notification.type) {
      case 'direct_message':
        return '/messages';
      case 'follow':
        return `/users/${notification.actorId}`;
      case 'post_like':
      case 'post_comment':
      case 'post_repost':
        return getPostNotificationTarget(notification);
      default:
        return '/notifications';
    }
  };

  const formatNotificationType = (type) => {
    switch (type) {
      case 'follow':
        return 'follow';
      case 'post_like':
        return 'like';
      case 'post_comment':
        return 'comment';
      case 'post_repost':
        return 'repost';
      case 'direct_message':
        return 'message';
      default:
        return type.replaceAll('_', ' ');
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
      // Navigate anyway even if marking as read fails
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
        <div className="notifications-loading">Loading notifications...</div>
      </div>
    );
  }

  return (
    <div className="notifications-panel">
      <div className="notifications-header">
        <div>
          <h2 className="notifications-title">Notifications</h2>
          <p className="notifications-subtitle">Likes, comments, reposts, followers, and direct messages collected in one place.</p>
        </div>
        <button
          type="button"
          className="notifications-mark-all"
          onClick={handleMarkAllAsRead}
          disabled={isMarkingAll || unreadCount === 0}
        >
          {isMarkingAll ? 'Marking...' : 'Mark all as read'}
        </button>
      </div>

      {error && <div className="notifications-error">{error}</div>}

      {notifications.length === 0 ? (
        <div className="notifications-empty">
          <strong>No notifications yet.</strong>
          <span>When someone interacts with you, it will appear here.</span>
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
                <span className="notifications-item-type">{formatNotificationType(notification.type)}</span>
                <span className="notifications-item-date">{formatDate(notification.createdAt)}</span>
              </div>
              <div className="notifications-item-message">{notification.message}</div>
              {!notification.isRead && <span className="notifications-unread-pill">New</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default Notifications;
