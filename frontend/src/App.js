import React, { useCallback, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate, useParams, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navigation from './components/Navigation';
import Login from './components/Login';
import Register from './components/Register';
import ProtectedRoute from './components/ProtectedRoute';
import FollowUser from './components/FollowUser';
import FollowersList from './components/FollowersList';
import FollowingList from './components/FollowingList';
import NetworkSuggestions from './components/NetworkSuggestions';
import Wall from './components/Wall';
import DirectMessages from './components/DirectMessages';
import Notifications from './components/Notifications';
import SavedPosts from './components/SavedPosts';
import CreatePost from './components/CreatePost';
import ProfilePosts from './components/ProfilePosts';
import PostItem from './components/PostItem';
import UserSearch from './components/UserSearch';
import UserProfile from './components/UserProfile';
import NotificationToasts from './components/NotificationToasts';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { userApi } from './services/userApi';
import { postsApi } from './services/postsApi';
import { followApi } from './services/followApi';
import './App.css';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

function AppContent() {
  return (
    <div className="App">
      <ThemeToggleButton />
      <NotificationToasts />
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
                <Navigate to="/wall" replace />
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
            path="/saved"
            element={
              <ProtectedRoute>
                <SavedPostsPage />
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
            path="/messages/:userId"
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
            path="/posts/:postId"
            element={
              <ProtectedRoute>
                <PostDetailPage />
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
  );
}

function ThemeToggleButton() {
  const { theme, toggleTheme } = useTheme();
  const isDarkMode = theme === 'dark';

  return (
    <button
      type="button"
      className="app-theme-toggle"
      onClick={toggleTheme}
      aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <span className="app-theme-toggle-icon" aria-hidden="true">{isDarkMode ? '☀' : '☾'}</span>
      <span className="app-theme-toggle-text">{isDarkMode ? 'Light mode' : 'Dark mode'}</span>
    </button>
  );
}

function AppShell({ title, subtitle, children, rightSidebar, hideRightSidebar = false, shellClassName = '' }) {
  const shellClasses = ['app-shell', shellClassName].filter(Boolean).join(' ');

  return (
    <div className={shellClasses}>
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

      {!hideRightSidebar && (
        <aside className="app-shell-right">
          {rightSidebar || <DefaultRightSidebar />}
        </aside>
      )}
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
      return 'No activity yet';
    }

    return new Date(dateValue).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const getFocusMessage = () => {
    if (activityLoading) {
      return 'We are loading your overview and next best steps right now.';
    }

    if (activity.postsCount === 0) {
      return 'You have not published anything yet. Start by creating your first post from your profile.';
    }

    if (activity.followingCount === 0) {
      return 'You have started posting. Follow more people to make your feed feel more alive.';
    }

    if (activity.followersCount === 0) {
      return 'You are up and running. Keep posting and interacting to start building your audience.';
    }

    return 'Your activity looks strong right now. Keep posting, replying, and discovering new profiles.';
  };

  return (
    <div className="sidebar-stack">
      <section className="sidebar-card">
        <span className="sidebar-card-label">Today&apos;s focus</span>
        <h3>Hi {username}</h3>
        <p>{getFocusMessage()}</p>
        <div className="sidebar-link-list sidebar-link-list-spaced">
          <Link to="/profile" className="sidebar-link-item">Create or manage posts</Link>
          <Link to="/saved" className="sidebar-link-item">Open saved posts</Link>
          <Link to="/wall" className="sidebar-link-item">Find new profiles and posts</Link>
          <Link to="/messages" className="sidebar-link-item">Open your messages</Link>
        </div>
      </section>

      <section className="sidebar-card">
        <span className="sidebar-card-label">Quick access</span>
        <div className="sidebar-link-list">
          <Link to="/wall" className="sidebar-link-item">Explore the feed</Link>
          <Link to="/saved" className="sidebar-link-item">View saved posts</Link>
          <Link to="/notifications" className="sidebar-link-item">Open notifications</Link>
          <Link to="/profile" className="sidebar-link-item">Open your profile</Link>
        </div>
      </section>

      <section className="sidebar-card">
        <span className="sidebar-card-label">Your activity</span>
        <h3>{username}&apos;s overview</h3>
        <div className="sidebar-stats-grid">
          <div className="sidebar-stat-item">
            <span className="sidebar-stat-value">{activityLoading ? '…' : activity.postsCount}</span>
            <span className="sidebar-stat-label">Posts</span>
          </div>
          <div className="sidebar-stat-item">
            <span className="sidebar-stat-value">{activityLoading ? '…' : activity.followersCount}</span>
            <span className="sidebar-stat-label">Followers</span>
          </div>
          <div className="sidebar-stat-item">
            <span className="sidebar-stat-value">{activityLoading ? '…' : activity.followingCount}</span>
            <span className="sidebar-stat-label">Following</span>
          </div>
        </div>
        <p className="sidebar-activity-text">
          Last active: <strong>{activityLoading ? 'Loading…' : formatLastActive(activity.lastActiveAt)}</strong>
        </p>
        <p className="sidebar-activity-tip">Publish from your profile to keep your feed active.</p>
      </section>
    </div>
  );
}

// Komponent för Följ-sidan
function FollowPage() {
  const { userId } = useAuth();
  const navigate = useNavigate();
  const [networkRefreshKey, setNetworkRefreshKey] = useState(0);

  const handleUserSelect = (user) => {
    if (user?.id) {
      navigate(`/users/${user.id}`);
    }
  };

  return (
    <AppShell title="Network" subtitle="Search for people, discover profiles, and grow your network.">
      <div className="content-panel">
        <div className="user-input-section">
          <div className="input-group">
            <label htmlFor="targetUserId">Search for people to follow</label>
            <UserSearch
              onUserSelect={handleUserSelect}
              placeholder="Search for people..."
              excludeUserId={userId}
            />
          </div>
        </div>

        <NetworkSuggestions
          userId={userId}
          refreshKey={networkRefreshKey}
          onFollowChange={() => setNetworkRefreshKey((value) => value + 1)}
        />

        <div className="lists-section">
          <div className="lists-container">
            <FollowersList 
              userId={userId}
              refreshKey={networkRefreshKey}
              onFollowerClick={handleUserSelect}
            />
            <FollowingList 
              userId={userId}
              refreshKey={networkRefreshKey}
              onFollowingClick={handleUserSelect}
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function WallPage() {
  const { userId } = useAuth();

  return (
    <AppShell title="Discover" subtitle="Public posts in a faster feed with less focus on the composer.">
      <Wall userId={userId} showHeader={false} />
    </AppShell>
  );
}

function MessagesPage() {
  const { userId } = useAuth();
  return (
    <AppShell
      title="Messages"
      subtitle="Private conversations in a dedicated space."
      hideRightSidebar
      shellClassName="app-shell-messages"
    >
      <DirectMessages userId={userId} />
    </AppShell>
  );
}

function SavedPostsPage() {
  const { userId } = useAuth();

  return (
    <AppShell title="Saved" subtitle="Posts you want to revisit, gathered in one place.">
      <SavedPosts userId={userId} showHeader={false} />
    </AppShell>
  );
}

function NotificationsPage() {
  return (
    <AppShell title="Notifications" subtitle="All activity around you, collected in one place.">
      <Notifications />
    </AppShell>
  );
}

function CreatePostPage() {
  return <Navigate to="/profile" replace />;
}

function ProfilePage() {
  const { userId, username } = useAuth();
  const location = useLocation();
  const [refreshKey, setRefreshKey] = useState(0);
  const searchParams = new URLSearchParams(location.search);
  const highlightedPostId = searchParams.get('postId');
  const openCommentsPostId = searchParams.get('openComments') === '1'
    ? searchParams.get('postId')
    : null;

  return (
    <AppShell title="My profile" subtitle="Manage your identity and create your posts here.">
      <div className="profile-page-container">
        <UserProfile userId={userId} isEditable refreshKey={refreshKey} />
        <CreatePost
          senderId={userId}
          compact
          onPostCreated={() => setRefreshKey((value) => value + 1)}
        />
        <ProfilePosts
          userId={userId}
          username={username}
          isOwnProfile
          currentUserId={userId}
          refreshKey={refreshKey}
          highlightedPostId={highlightedPostId}
          openCommentsPostId={openCommentsPostId}
        />
      </div>
    </AppShell>
  );
}

function PublicProfilePage() {
  const { userId: currentUserId } = useAuth();
  const { userId: profileUserId } = useParams();
  const location = useLocation();
  const [refreshKey, setRefreshKey] = useState(0);
  const searchParams = new URLSearchParams(location.search);
  const highlightedPostId = searchParams.get('postId');
  const openCommentsPostId = searchParams.get('openComments') === '1'
    ? searchParams.get('postId')
    : null;

  if (!profileUserId) {
    return <Navigate to="/" replace />;
  }

  const isOwnProfile = currentUserId === profileUserId;

  return (
    <AppShell title="Profile" subtitle="View the user&apos;s public presence.">
      <div className="profile-page-container">
        <UserProfile userId={profileUserId} isEditable={false} refreshKey={refreshKey} />
        {!isOwnProfile && (
          <div className="public-profile-actions">
            <FollowUser
              followerId={currentUserId}
              followingId={profileUserId}
              onFollowChange={() => setRefreshKey((value) => value + 1)}
            />
          </div>
        )}
        <ProfilePosts
          userId={profileUserId}
          isOwnProfile={false}
          currentUserId={currentUserId}
          highlightedPostId={highlightedPostId}
          openCommentsPostId={openCommentsPostId}
        />
      </div>
    </AppShell>
  );
}

function PostDetailPage() {
  const { userId } = useAuth();
  const { postId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [usernames, setUsernames] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const searchParams = new URLSearchParams(location.search);
  const shouldOpenComments = searchParams.get('openComments') === '1';

  const loadPost = useCallback(async () => {
    if (!postId) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const postData = await postsApi.getPostById(postId);
      setPost(postData);

      const uniqueUserIds = new Set();
      if (postData.senderId) uniqueUserIds.add(postData.senderId);
      if (postData.recipientId) uniqueUserIds.add(postData.recipientId);
      if (postData.originalSenderId) uniqueUserIds.add(postData.originalSenderId);
      (postData.comments || []).forEach((comment) => {
        if (comment.userId) uniqueUserIds.add(comment.userId);
      });

      const usernameEntries = await Promise.all(
        Array.from(uniqueUserIds).map(async (id) => {
          try {
            const user = await userApi.getUserById(id);
            return [id, user?.username || id];
          } catch {
            return [id, id];
          }
        })
      );

      setUsernames(Object.fromEntries(usernameEntries));
    } catch (err) {
      setError(err?.message || 'Could not load the post.');
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    loadPost();
  }, [loadPost]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const datePart = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    const timePart = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${datePart} · ${timePart}`;
  };

  const isPublicPost = (postItem) => !postItem.recipientId || postItem.recipientId === postItem.senderId;

  return (
    <AppShell title="Post" subtitle="Open the exact post connected to your notification.">
      <div className="timeline">
        <div className="timeline-header">
          <button type="button" className="timeline-refresh-button" onClick={() => navigate(-1)} aria-label="Go back" title="Go back">
            <span className="refresh-icon">←</span>
          </button>
        </div>

        {loading && <div className="loading"><span className="loading-spinner"></span><span>Loading post...</span></div>}

        {error && !loading && (
          <div className="error-message" role="alert">
            <span className="error-icon">⚠️</span>
            <span className="error-text">{error}</span>
            <button onClick={loadPost} className="error-retry-button">Try again</button>
          </div>
        )}

        {post && !loading && !error && (
          <div className="timeline-posts">
            <PostItem
              post={post}
              usernames={usernames}
              currentUserId={userId}
              formatDate={formatDate}
              isPublicPost={isPublicPost}
              onPostChanged={loadPost}
              containerClassName="post-item"
              postDomId={`post-${post.id}`}
              isHighlighted
              shouldOpenComments={shouldOpenComments}
            />
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default App;