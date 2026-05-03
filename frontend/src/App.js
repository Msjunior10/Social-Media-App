import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useParams, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navigation from './components/Navigation';
import Login from './components/Login';
import Register from './components/Register';
import ProtectedRoute from './components/ProtectedRoute';
import FollowUser from './components/FollowUser';
import FollowersList from './components/FollowersList';
import FollowingList from './components/FollowingList';
import Timeline from './components/Timeline';
import Wall from './components/Wall';
import DirectMessages from './components/DirectMessages';
import Notifications from './components/Notifications';
import CreatePost from './components/CreatePost';
import ProfilePosts from './components/ProfilePosts';
import UserSearch from './components/UserSearch';
import UserProfile from './components/UserProfile';
import { userApi } from './services/userApi';
import { postsApi } from './services/postsApi';
import { followApi } from './services/followApi';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <main className="App-main">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <FollowPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/timeline"
                element={
                  <ProtectedRoute>
                    <TimelinePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/wall"
                element={
                  <ProtectedRoute>
                    <WallPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/notifications"
                element={
                  <ProtectedRoute>
                    <NotificationsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/messages"
                element={
                  <ProtectedRoute>
                    <MessagesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/create-post"
                element={
                  <ProtectedRoute>
                    <CreatePostPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/users/:userId"
                element={
                  <ProtectedRoute>
                    <PublicProfilePage />
                  </ProtectedRoute>
                }
              />
              
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

function AppShell({ title, subtitle, children, rightSidebar }) {
  return (
    <div className="app-shell">
      <aside className="app-shell-sidebar">
        <Navigation />
      </aside>

      <section className="app-shell-center">
        <div className="page-column">
          <div className="page-column-header">
            <div>
              <h1>{title}</h1>
              {subtitle && <p>{subtitle}</p>}
            </div>
          </div>
          <div className="page-column-content">{children}</div>
        </div>
      </section>

      <aside className="app-shell-right">
        {rightSidebar || <DefaultRightSidebar />}
      </aside>
    </div>
  );
}

function DefaultRightSidebar() {
  const { username, userId } = useAuth();
  const [activity, setActivity] = useState({
    postsCount: 0,
    followersCount: 0,
    followingCount: 0,
    lastActiveAt: null,
  });
  const [activityLoading, setActivityLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchActivity = async () => {
      if (!userId) {
        if (isMounted) {
          setActivityLoading(false);
        }
        return;
      }

      try {
        setActivityLoading(true);

        const [currentUser, posts, followers, following] = await Promise.all([
          userApi.getCurrentUser(),
          postsApi.getTimelineByUserId(userId),
          followApi.getFollowers(userId),
          followApi.getFollowing(userId),
        ]);

        if (!isMounted) {
          return;
        }

        setActivity({
          postsCount: posts.length,
          followersCount: followers.length,
          followingCount: following.length,
          lastActiveAt: currentUser?.lastActiveAt || null,
        });
      } catch {
        if (!isMounted) {
          return;
        }

        setActivity({
          postsCount: 0,
          followersCount: 0,
          followingCount: 0,
          lastActiveAt: null,
        });
      } finally {
        if (isMounted) {
          setActivityLoading(false);
        }
      }
    };

    fetchActivity();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const formatLastActive = (dateValue) => {
    if (!dateValue) {
      return 'Ingen aktivitet ännu';
    }

    return new Date(dateValue).toLocaleString('sv-SE', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const getFocusMessage = () => {
    if (activityLoading) {
      return 'Vi laddar din överblick och dina nästa steg just nu.';
    }

    if (activity.postsCount === 0) {
      return 'Du har ännu inte publicerat något. Börja med att skapa ditt första inlägg från profilen.';
    }

    if (activity.followingCount === 0) {
      return 'Du har börjat publicera. Följ fler användare för att göra tidslinjen mer levande.';
    }

    if (activity.followersCount === 0) {
      return 'Du är igång. Fortsätt publicera och interagera för att börja bygga din publik.';
    }

    return 'Du har bra aktivitet just nu. Fortsätt med nya inlägg, svar och upptäck fler profiler.';
  };

  return (
    <div className="sidebar-stack">
      <section className="sidebar-card">
        <span className="sidebar-card-label">Fokus idag</span>
        <h3>Hej {username}</h3>
        <p>{getFocusMessage()}</p>
        <div className="sidebar-link-list sidebar-link-list-spaced">
          <Link to="/profile" className="sidebar-link-item">Skapa eller hantera inlägg</Link>
          <Link to="/timeline" className="sidebar-link-item">Se vad ditt nätverk gör</Link>
          <Link to="/wall" className="sidebar-link-item">Hitta nya profiler och inlägg</Link>
        </div>
      </section>

      <section className="sidebar-card">
        <span className="sidebar-card-label">Snabbåtkomst</span>
        <div className="sidebar-link-list">
          <Link to="/wall" className="sidebar-link-item">Upptäck flödet</Link>
          <Link to="/timeline" className="sidebar-link-item">Se din tidslinje</Link>
          <Link to="/profile" className="sidebar-link-item">Öppna din profil</Link>
        </div>
      </section>

      <section className="sidebar-card">
        <span className="sidebar-card-label">Din aktivitet</span>
        <h3>{username}s överblick</h3>
        <div className="sidebar-stats-grid">
          <div className="sidebar-stat-item">
            <span className="sidebar-stat-value">{activityLoading ? '…' : activity.postsCount}</span>
            <span className="sidebar-stat-label">Inlägg</span>
          </div>
          <div className="sidebar-stat-item">
            <span className="sidebar-stat-value">{activityLoading ? '…' : activity.followersCount}</span>
            <span className="sidebar-stat-label">Följare</span>
          </div>
          <div className="sidebar-stat-item">
            <span className="sidebar-stat-value">{activityLoading ? '…' : activity.followingCount}</span>
            <span className="sidebar-stat-label">Följer</span>
          </div>
        </div>
        <p className="sidebar-activity-text">
          Senast aktiv: <strong>{activityLoading ? 'Laddar…' : formatLastActive(activity.lastActiveAt)}</strong>
        </p>
        <p className="sidebar-activity-tip">Publicera från din profil för att hålla ditt flöde levande.</p>
      </section>
    </div>
  );
}

// Komponent för Följ-sidan
function FollowPage() {
  const { userId } = useAuth();
  const navigate = useNavigate();

  const handleUserSelect = (user) => {
    if (user?.id) {
      navigate(`/users/${user.id}`);
    }
  };

  return (
    <AppShell title="Utforska" subtitle="Sök användare och bygg upp ditt nätverk.">
      <div className="content-panel">
        <div className="user-input-section">
          <div className="input-group">
            <label htmlFor="targetUserId">Sök användare att följa</label>
            <UserSearch
              onUserSelect={handleUserSelect}
              placeholder="Sök efter användare..."
              excludeUserId={userId}
            />
          </div>
        </div>

        <div className="lists-section">
          <div className="lists-container">
            <FollowersList 
              userId={userId}
              onFollowerClick={handleUserSelect}
            />
            <FollowingList 
              userId={userId}
              onFollowingClick={handleUserSelect}
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function TimelinePage() {
  const { userId } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <AppShell title="Tidslinje" subtitle="Det senaste från dig och ditt nätverk.">
      <CreatePost
        senderId={userId}
        compact
        onPostCreated={() => setRefreshKey((value) => value + 1)}
      />
      <Timeline userId={userId} refreshKey={refreshKey} showHeader={false} />
    </AppShell>
  );
}

function WallPage() {
  const { userId } = useAuth();

  return (
    <AppShell title="Upptäck" subtitle="Offentliga inlägg i ett snabbare flöde utan composer i fokus.">
      <Wall userId={userId} showHeader={false} />
    </AppShell>
  );
}

function MessagesPage() {
  const { userId } = useAuth();
  return (
    <AppShell title="Meddelanden" subtitle="Privata konversationer i realtid.">
      <DirectMessages userId={userId} />
    </AppShell>
  );
}

function NotificationsPage() {
  return (
    <AppShell title="Notifikationer" subtitle="All aktivitet som rör dig, samlad på ett ställe.">
      <Notifications />
    </AppShell>
  );
}

function CreatePostPage() {
  return <Navigate to="/profile" replace />;
}

function ProfilePage() {
  const { userId, username } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <AppShell title="Min profil" subtitle="Hantera din identitet och skapa dina inlägg här.">
      <div className="profile-page-container">
        <UserProfile userId={userId} isEditable />
        <CreatePost
          senderId={userId}
          compact
          onPostCreated={() => setRefreshKey((value) => value + 1)}
        />
        <ProfilePosts userId={userId} username={username} isOwnProfile currentUserId={userId} refreshKey={refreshKey} />
      </div>
    </AppShell>
  );
}

function PublicProfilePage() {
  const { userId: currentUserId } = useAuth();
  const { userId: profileUserId } = useParams();

  if (!profileUserId) {
    return <Navigate to="/" replace />;
  }

  const isOwnProfile = currentUserId === profileUserId;

  return (
    <AppShell title="Profil" subtitle="Se användarens offentliga närvaro.">
      <div className="profile-page-container">
        <UserProfile userId={profileUserId} isEditable={false} />
        {!isOwnProfile && (
          <div className="public-profile-actions">
            <FollowUser followerId={currentUserId} followingId={profileUserId} />
          </div>
        )}
        <ProfilePosts userId={profileUserId} isOwnProfile={false} currentUserId={currentUserId} />
      </div>
    </AppShell>
  );
}

export default App;