import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Navigation.css';

function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { username, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigationItems = [
    { to: '/wall', label: 'Upptäck', icon: '⌂' },
    { to: '/timeline', label: 'Tidslinje', icon: '✦' },
    { to: '/', label: 'Nätverk', icon: '◎' },
    { to: '/messages', label: 'Meddelanden', icon: '✉' },
    { to: '/profile', label: 'Profil', icon: '◌' },
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

  return (
    <div className="navigation-container">
      <div className="navigation-topbar">
        <div className="navigation-brand">
          <div className="navigation-brand-icon">S</div>
          <div>
            <div className="navigation-brand-name">Socially</div>
            <div className="navigation-brand-subtitle">Curated social flow</div>
          </div>
        </div>

        <button
          type="button"
          className={`navigation-menu-toggle ${isMobileMenuOpen ? 'open' : ''}`}
          aria-label={isMobileMenuOpen ? 'Stäng meny' : 'Öppna meny'}
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
              </Link>
            );
          })}
        </nav>

        <button type="button" className="navigation-compose-button" onClick={() => navigate('/profile')}>
          Skapa i profil
        </button>

        <div className="navigation-user">
          <div className="navigation-user-avatar">{(username || 'U').charAt(0).toUpperCase()}</div>
          <div className="navigation-user-meta">
            <span className="navigation-username">{username}</span>
            <span className="navigation-handle">@{(username || 'user').toLowerCase()}</span>
          </div>
          <button onClick={handleLogout} className="logout-button">
            Logga ut
          </button>
        </div>
      </div>
    </div>
  );
}

export default Navigation;
