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
  const [activeFilter, setActiveFilter] = useState('all');

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
      focus: notification.postId,
      notificationType: notification.type,
    });

    if (notification.type === 'post_comment' || notification.type === 'comment_mention') {
      searchParams.set('openComments', '1');
    }

    return `/posts/${notification.postId}?${searchParams.toString()}`;
  };

  const getNotificationTarget = (notification) => {
    switch (notification.type) {
      case 'direct_message':
        return notification.actorId ? `/messages/${notification.actorId}` : '/messages';
      case 'follow':
        return `/users/${notification.actorId}`;
      case 'post_like':
      case 'post_comment':
      case 'post_mention':
      case 'comment_mention':
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
      case 'post_mention':
        return 'mention';
      case 'comment_mention':
        return 'comment mention';
      case 'post_repost':
        return 'repost';
      case 'direct_message':
        return 'message';
      default:
        return type.replaceAll('_', ' ');
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'follow':
        return '↗';
      case 'post_like':
        return '♥';
      case 'post_comment':
        return '💬';
      case 'post_mention':
        return '@';
      case 'comment_mention':
        return '✦';
      case 'post_repost':
        return '⟳';
      case 'direct_message':
        return '✉';
      default:
        return '•';
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
  const latestNotificationAt = notifications[0]?.createdAt;
  const filterItems = [
    { id: 'all', label: 'All' },
    { id: 'unread', label: 'Unread' },
    { id: 'posts', label: 'Posts' },
    { id: 'follows', label: 'Follows' },
    { id: 'messages', label: 'Messages' },
  ];

  const filteredNotifications = notifications.filter((notification) => {
    switch (activeFilter) {
      case 'unread':
        return !notification.isRead;
      case 'posts':
        return ['post_like', 'post_comment', 'post_mention', 'comment_mention', 'post_repost'].includes(notification.type);
      case 'follows':
        return notification.type === 'follow';
      case 'messages':
        return notification.type === 'direct_message';
      default:
        return true;
    }
  });

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
          <span className="notifications-kicker">Activity center</span>
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

      <div className="notifications-summary-strip">
        <div className="notifications-summary-card">
          <strong>{notifications.length}</strong>
          <span>Total</span>
        </div>
        <div className="notifications-summary-card notifications-summary-card-accent">
          <strong>{unreadCount}</strong>
          <span>Unread</span>
        </div>
        <div className="notifications-summary-card">
          <strong>{notifications.filter((item) => item.type === 'direct_message').length}</strong>
          <span>Messages</span>
        </div>
        <div className="notifications-summary-card">
          <strong>{latestNotificationAt ? formatDate(latestNotificationAt) : '—'}</strong>
          <span>Latest activity</span>
        </div>
      </div>

      <div className="notifications-filters" role="tablist" aria-label="Notification filters">
        {filterItems.map((filter) => (
          <button
            key={filter.id}
            type="button"
            className={`notifications-filter ${activeFilter === filter.id ? 'active' : ''}`}
            onClick={() => setActiveFilter(filter.id)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {filteredNotifications.length === 0 ? (
        <div className="notifications-empty">
          <strong>{notifications.length === 0 ? 'No notifications yet.' : 'Nothing matches this filter.'}</strong>
          <span>{notifications.length === 0 ? 'When someone interacts with you, it will appear here.' : 'Try another filter to see the rest of your activity.'}</span>
        </div>
      ) : (
        <div className="notifications-list">
          {filteredNotifications.map((notification) => (
            <button
              key={notification.id}
              type="button"
              className={`notifications-item ${notification.isRead ? 'read' : 'unread'}`}
              onClick={() => handleOpenNotification(notification)}
            >
              <div className="notifications-item-main">
                <div className="notifications-item-icon" aria-hidden="true">{getNotificationIcon(notification.type)}</div>
                <div className="notifications-item-body">
                  <div className="notifications-item-top">
                    <span className="notifications-item-type">{formatNotificationType(notification.type)}</span>
                    <span className="notifications-item-date">{formatDate(notification.createdAt)}</span>
                  </div>
                  <div className="notifications-item-message">{notification.message}</div>
                </div>
              </div>
              {!notification.isRead && <span className="notifications-unread-pill">New</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default Notifications;
