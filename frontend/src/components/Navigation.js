import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Navigation.css';

function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { username, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="navigation-container">
      <nav className="navigation">
        <Link 
          to="/" 
          className={location.pathname === '/' ? 'nav-link active' : 'nav-link'}
        >
          Följ Användare
        </Link>
        <Link 
          to="/timeline" 
          className={location.pathname === '/timeline' ? 'nav-link active' : 'nav-link'}
        >
          Tidslinje
        </Link>
        <Link 
          to="/wall" 
          className={location.pathname === '/wall' ? 'nav-link active' : 'nav-link'}
        >
          Vägg
        </Link>
        <Link 
          to="/messages" 
          className={location.pathname === '/messages' ? 'nav-link active' : 'nav-link'}
        >
          Direktmeddelanden
        </Link>
        <Link 
          to="/create-post" 
          className={location.pathname === '/create-post' ? 'nav-link active' : 'nav-link'}
        >
          Skapa inlägg
        </Link>
      </nav>
      <div className="navigation-user">
        <span className="navigation-username">Inloggad som: {username}</span>
        <button onClick={handleLogout} className="logout-button">
          Logga ut
        </button>
      </div>
    </div>
  );
}

export default Navigation;
