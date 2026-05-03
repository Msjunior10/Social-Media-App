import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
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
import CreatePost from './components/CreatePost';
import ProfilePosts from './components/ProfilePosts';
import UserSearch from './components/UserSearch';
import UserProfile from './components/UserProfile';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <header className="App-header">
            <h1>Socially</h1>
            <p>Socialt nätverk</p>
          </header>

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
    <div>
      <Navigation />
      <div className="user-input-section">
        <div className="input-group">
          <label htmlFor="targetUserId">Sök användare att följa:</label>
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
  );
}

function TimelinePage() {
  const { userId } = useAuth();
  return (
    <div>
      <Navigation />
      <Timeline userId={userId} />
    </div>
  );
}

function WallPage() {
  const { userId } = useAuth();
  return (
    <div>
      <Navigation />
      <Wall userId={userId} />
    </div>
  );
}

function MessagesPage() {
  const { userId } = useAuth();
  return (
    <div>
      <Navigation />
      <DirectMessages userId={userId} />
    </div>
  );
}

function CreatePostPage() {
  const { userId } = useAuth();
  return (
    <div>
      <Navigation />
      <CreatePost
        senderId={userId}
        onPostCreated={() => {
          console.log('Nytt inlägg skapat!');
        }}
      />
    </div>
  );
}

function ProfilePage() {
  const { userId, username } = useAuth();

  return (
    <div>
      <Navigation />
      <div className="profile-page-container">
        <UserProfile userId={userId} isEditable />
        <ProfilePosts userId={userId} username={username} isOwnProfile currentUserId={userId} />
      </div>
    </div>
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
    <div>
      <Navigation />
      <div className="profile-page-container">
        <UserProfile userId={profileUserId} isEditable={false} />
        {!isOwnProfile && (
          <div className="public-profile-actions">
            <FollowUser followerId={currentUserId} followingId={profileUserId} />
          </div>
        )}
        <ProfilePosts userId={profileUserId} isOwnProfile={false} currentUserId={currentUserId} />
      </div>
    </div>
  );
}

export default App;