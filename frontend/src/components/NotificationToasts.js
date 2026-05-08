import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { notificationsApi } from '../services/notificationsApi';
import { notificationsRealtime } from '../services/notificationsRealtime';
import './NotificationToasts.css';

const TOAST_DURATION_MS = 5000;
const MAX_TOASTS = 3;
const TOAST_POLL_INTERVAL_MS = 15000;

function NotificationToasts() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const [toasts, setToasts] = useState([]);
  const seenNotificationIdsRef = useRef(new Set());
  const hasLoadedInitialNotificationsRef = useRef(false);

  const currentPath = useMemo(() => location.pathname, [location.pathname]);

  const shouldSuppressToast = useCallback((notification) => {
    const target = getNotificationTarget(notification);

    return currentPath === '/notifications'
      || (notification.type === 'direct_message' && currentPath.startsWith('/messages'))
      || (notification.type === 'follow' && target === currentPath);
  }, [currentPath]);

  const enqueueToast = useCallback((notification) => {
    if (!notification || shouldSuppressToast(notification)) {
      return;
    }

    setToasts((prev) => {
      const alreadyQueued = prev.some((toast) => toast.notification.id === notification.id);
      if (alreadyQueued) {
        return prev;
      }

      const toast = {
        id: `${notification.id}-${Date.now()}`,
        notification,
      };

      return [toast, ...prev].slice(0, MAX_TOASTS);
    });
  }, [shouldSuppressToast]);

  const syncNotifications = useCallback(async (showNewAsToasts) => {
    try {
      const notifications = await notificationsApi.getNotifications();
      const items = Array.isArray(notifications) ? notifications : [];
      const unseenNotifications = [];

      items.forEach((notification) => {
        if (!notification?.id) {
          return;
        }

        if (!seenNotificationIdsRef.current.has(notification.id)) {
          unseenNotifications.push(notification);
        }

        seenNotificationIdsRef.current.add(notification.id);
      });

      if (showNewAsToasts) {
        unseenNotifications
          .sort((left, right) => new Date(left.createdAt) - new Date(right.createdAt))
          .forEach((notification) => enqueueToast(notification));
      }

      hasLoadedInitialNotificationsRef.current = true;
    } catch {
      // Silent fallback if polling fails
    }
  }, [enqueueToast]);

  useEffect(() => {
    if (!isAuthenticated) {
      setToasts([]);
      seenNotificationIdsRef.current = new Set();
      hasLoadedInitialNotificationsRef.current = false;
      return undefined;
    }

    syncNotifications(false);

    const unsubscribe = notificationsRealtime.subscribe((event) => {
      if (event.type === 'notification-received' && event.notification) {
        seenNotificationIdsRef.current.add(event.notification.id);
        enqueueToast(event.notification);
        return;
      }

      if (event.type === 'reconnected') {
        syncNotifications(hasLoadedInitialNotificationsRef.current);
      }
    });

    const intervalId = window.setInterval(() => {
      syncNotifications(hasLoadedInitialNotificationsRef.current);
    }, TOAST_POLL_INTERVAL_MS);

    return () => {
      unsubscribe();
      window.clearInterval(intervalId);
    };
  }, [enqueueToast, isAuthenticated, syncNotifications]);

  useEffect(() => {
    if (toasts.length === 0) {
      return undefined;
    }

    const timeoutIds = toasts.map((toast) => window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== toast.id));
    }, TOAST_DURATION_MS));

    return () => {
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, [toasts]);

  const dismissToast = (toastId) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== toastId));
  };

  const handleToastClick = (toast) => {
    dismissToast(toast.id);
    navigate(getNotificationTarget(toast.notification));
  };

  if (!isAuthenticated || toasts.length === 0) {
    return null;
  }

  return (
    <div className="notification-toast-stack" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <div key={toast.id} className="notification-toast">
          <div className="notification-toast-accent" aria-hidden="true">
            {getNotificationIcon(toast.notification.type)}
          </div>
          <button
            type="button"
            className="notification-toast-body"
            onClick={() => handleToastClick(toast)}
          >
            <div className="notification-toast-top">
              <span className="notification-toast-label">New notification</span>
              <span className="notification-toast-type">{formatNotificationType(toast.notification.type)}</span>
            </div>
            <span className="notification-toast-message">{toast.notification.message}</span>
            <span className="notification-toast-action">Open</span>
          </button>
          <button
            type="button"
            className="notification-toast-close"
            onClick={() => dismissToast(toast.id)}
            aria-label="Close notification"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

function formatNotificationType(type) {
  switch (type) {
    case 'follow':
      return 'Follower';
    case 'post_like':
      return 'Like';
    case 'post_comment':
      return 'Comment';
    case 'post_mention':
      return 'Mention';
    case 'comment_mention':
      return 'Comment mention';
    case 'post_repost':
      return 'Repost';
    case 'direct_message':
      return 'Message';
    default:
      return 'Activity';
  }
}

function getNotificationIcon(type) {
  switch (type) {
    case 'follow':
      return '◎';
    case 'post_like':
      return '♥';
    case 'post_comment':
      return '✦';
    case 'post_mention':
      return '@';
    case 'comment_mention':
      return '✦';
    case 'post_repost':
      return '↻';
    case 'direct_message':
      return '✉';
    default:
      return '•';
  }
}

function getNotificationTarget(notification) {
  switch (notification.type) {
    case 'direct_message':
      return notification.actorId ? `/messages/${notification.actorId}` : '/messages';
    case 'follow':
      return `/users/${notification.actorId}`;
    case 'post_like':
    case 'post_comment':
    case 'post_mention':
    case 'comment_mention':
    case 'post_repost': {
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
    }
    default:
      return '/notifications';
  }
}

export default NotificationToasts;