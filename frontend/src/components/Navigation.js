import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { notificationsApi } from '../services/notificationsApi';
import { notificationsRealtime } from '../services/notificationsRealtime';
import './Navigation.css';

function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { username, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotificationBadgePulsing, setIsNotificationBadgePulsing] = useState(false);
  const isDarkMode = theme === 'dark';

  const navigationItems = [
    { to: '/wall', label: 'Discover', icon: '⌂' },
    { to: '/saved', label: 'Saved', icon: '☆' },
    { to: '/', label: 'Network', icon: '◎' },
    { to: '/notifications', label: 'Alerts', icon: '◔' },
    { to: '/messages', label: 'Messages', icon: '✉' },
    { to: '/profile', label: 'Profile', icon: '◌' },
  ];

  const handleLogout = () => {
    setIsMobileMenuOpen(false);
    logout();
    navigate('/login');
  };

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    let isMounted = true;
    let pulseTimeoutId = null;

    const triggerBadgePulse = () => {
      if (!isMounted) {
        return;
      }

      setIsNotificationBadgePulsing(false);

      window.setTimeout(() => {
        if (!isMounted) {
          return;
        }

        setIsNotificationBadgePulsing(true);

        if (pulseTimeoutId) {
          window.clearTimeout(pulseTimeoutId);
        }

        pulseTimeoutId = window.setTimeout(() => {
          if (isMounted) {
            setIsNotificationBadgePulsing(false);
          }
        }, 1600);
      }, 20);
    };

    const fetchUnreadCount = async () => {
      try {
        const response = await notificationsApi.getUnreadCount();
        if (isMounted) {
          setUnreadCount(response?.count ?? 0);
        }
      } catch {
        if (isMounted) {
          setUnreadCount(0);
        }
      }
    };

    fetchUnreadCount();

    const intervalId = window.setInterval(fetchUnreadCount, 30000);
    const unsubscribe = notificationsRealtime.subscribe((event) => {
      if (!isMounted) {
        return;
      }

      switch (event.type) {
        case 'notification-received':
          setUnreadCount(event.unreadCount ?? 0);
          if (location.pathname !== '/notifications') {
            triggerBadgePulse();
          }
          break;
        case 'notification-read':
        case 'notifications-read-all':
          setUnreadCount(event.unreadCount ?? 0);
          break;
        case 'reconnected':
          fetchUnreadCount();
          break;
        default:
          break;
      }
    });

    const handleNotificationsUpdated = () => fetchUnreadCount();
    window.addEventListener('notifications-updated', handleNotificationsUpdated);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      if (pulseTimeoutId) {
        window.clearTimeout(pulseTimeoutId);
      }
      unsubscribe();
      window.removeEventListener('notifications-updated', handleNotificationsUpdated);
    };
  }, [location.pathname]);

  return (
    <div className="navigation-container">
      <div className="navigation-topbar">
        <div className="navigation-brand">
          <div className="navigation-brand-icon">P</div>
          <div>
            <div className="navigation-brand-name">Postra</div>
            <div className="navigation-brand-subtitle">Your voice, your space.</div>
          </div>
        </div>

        <button
          type="button"
          className={`navigation-menu-toggle ${isMobileMenuOpen ? 'open' : ''}`}
          aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isMobileMenuOpen}
          onClick={() => setIsMobileMenuOpen((value) => !value)}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>

      <div className={`navigation-mobile-panel ${isMobileMenuOpen ? 'open' : ''}`}>
        <nav className="navigation">
          {navigationItems.map((item) => {
            const isActive = item.to === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.to);

            return (
              <Link
                key={item.to}
                to={item.to}
                className={isActive ? 'nav-link active' : 'nav-link'}
              >
                <span className="nav-link-icon" aria-hidden="true">{item.icon}</span>
                <span className="nav-link-label">{item.label}</span>
                {item.to === '/notifications' && unreadCount > 0 && (
                  <span className={`nav-link-badge ${isNotificationBadgePulsing ? 'nav-link-badge-pulse' : ''}`.trim()}>{unreadCount > 99 ? '99+' : unreadCount}</span>
                )}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          className="navigation-theme-toggle"
          onClick={toggleTheme}
          aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          <span className="navigation-theme-toggle-icon" aria-hidden="true">{isDarkMode ? '☀' : '☾'}</span>
          <span className="navigation-theme-toggle-text">{isDarkMode ? 'Light mode' : 'Dark mode'}</span>
        </button>

        <button type="button" className="navigation-compose-button" onClick={() => navigate('/profile')}>
          Create from profile
        </button>

        <div className="navigation-user">
          <div className="navigation-user-avatar">{(username || 'U').charAt(0).toUpperCase()}</div>
          <div className="navigation-user-meta">
            <span className="navigation-username">{username}</span>
            <span className="navigation-handle">@{(username || 'user').toLowerCase()}</span>
          </div>
          <button onClick={handleLogout} className="logout-button">
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}

export default Navigation;
