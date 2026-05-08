import React, { useState, useEffect, useCallback, useRef } from 'react';
import { wallApi } from '../services/wallApi';
import { userApi } from '../services/userApi';
import PostItem from './PostItem';
import './Wall.css';

function Wall({ userId, refreshKey = 0, showHeader = true }) {
  const PAGE_SIZE = 10;
  const skeletonItems = [1, 2, 3];
  const [posts, setPosts] = useState([]);
  const [usernames, setUsernames] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const loadMoreRef = useRef(null);

  const loadUsernames = useCallback(async (wallPosts) => {
    const uniqueUserIds = new Set();

    wallPosts.forEach(post => {
      if (post.senderId) uniqueUserIds.add(post.senderId);
      if (post.recipientId) uniqueUserIds.add(post.recipientId);
      if (post.originalSenderId) uniqueUserIds.add(post.originalSenderId);
      (post.comments || []).forEach(comment => {
        if (comment.userId) uniqueUserIds.add(comment.userId);
      });
    });

    const usernameMap = {};
    await Promise.all(
      Array.from(uniqueUserIds).map(async (id) => {
        try {
          const user = await userApi.getUserById(id);
          if (user) {
            usernameMap[id] = user.username;
          }
        } catch (err) {
          console.error(`Could not fetch user ${id}:`, err);
        }
      })
    );

    setUsernames(current => ({ ...current, ...usernameMap }));
  }, []);

  const fetchWallPage = useCallback(async (targetPage, replace = false) => {
    if (!userId) {
      return;
    }

    try {
      if (replace) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      setError(null);
      const wallPage = await wallApi.getWallPage(targetPage, PAGE_SIZE);
      const incomingPosts = [...wallPage.items].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      setPosts(current => {
        if (replace) {
          return incomingPosts;
        }

        const seen = new Set(current.map(post => post.id));
        return current.concat(incomingPosts.filter(post => !seen.has(post.id)));
      });
      setPage(wallPage.page);
      setHasMore(wallPage.hasMore);
      await loadUsernames(incomingPosts);
    } catch (err) {
      setError(err.message || 'Could not fetch wall');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [userId, loadUsernames]);

  const refreshWall = useCallback(async () => {
    setPosts([]);
    setUsernames({});
    setPage(1);
    setHasMore(false);
    await fetchWallPage(1, true);
  }, [fetchWallPage]);

  const loadMoreWall = useCallback(async () => {
    if (!hasMore || loading || loadingMore) {
      return;
    }

    await fetchWallPage(page + 1, false);
  }, [fetchWallPage, hasMore, loading, loadingMore, page]);

  useEffect(() => {
    if (userId) {
      refreshWall();
    }
  }, [userId, refreshWall, refreshKey]);

  useEffect(() => {
    if (!loadMoreRef.current || !hasMore) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMoreWall();
        }
      },
      { rootMargin: '240px 0px' }
    );

    observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, [hasMore, loadMoreWall]);

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

  const isPublicPost = (post) => !post.recipientId || post.recipientId === post.senderId;

  if (loading && posts.length === 0) {
    return (
      <div className="wall">
        <div className="wall-header">
          {showHeader && <h2>Wall</h2>}
        </div>
        <div className="wall-skeleton-list" aria-hidden="true">
          {skeletonItems.map((item) => (
            <div key={item} className="wall-skeleton-item">
              <div className="wall-skeleton-avatar" />
              <div className="wall-skeleton-body">
                <div className="wall-skeleton-row wall-skeleton-row-short" />
                <div className="wall-skeleton-row" />
                <div className="wall-skeleton-row wall-skeleton-row-medium" />
                <div className="wall-skeleton-chips">
                  <span className="wall-skeleton-chip" />
                  <span className="wall-skeleton-chip" />
                  <span className="wall-skeleton-chip" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="wall">
      {showHeader && (
        <div className="wall-header">
          <div className="wall-title-group">
            <h2>Wall</h2>
            <span className="wall-count-badge">{posts.length} loaded</span>
          </div>
          <button
            onClick={refreshWall}
            className="wall-refresh-button"
            disabled={loading || loadingMore}
            title="Refresh wall"
            aria-label="Refresh wall"
          >
            <span className={loading || loadingMore ? 'refresh-icon spinning' : 'refresh-icon'}>⟳</span>
          </button>
        </div>
      )}

      {error && (
        <div className="error-message" role="alert">
          <span className="error-icon">⚠️</span>
          <span className="error-text">{error}</span>
          <button onClick={refreshWall} className="error-retry-button">
            Try again
          </button>
        </div>
      )}

      {posts.length === 0 && !loading && !error ? (
        <div className="empty-message">
          <p>No public posts to show yet.</p>
          <p className="empty-hint">Create a post to fill the feed.</p>
        </div>
      ) : (
        <div className="posts-container">
          {posts.map((post) => (
            <PostItem
              key={post.id}
              post={post}
              usernames={usernames}
              currentUserId={userId}
              formatDate={formatDate}
              isPublicPost={isPublicPost}
              onPostChanged={refreshWall}
              containerClassName="post-card"
              recipientWrapperClassName="post-footer"
            />
          ))}
          {loadingMore && (
            <div className="wall-load-more">
              <span className="loading-spinner"></span>
              <span>Loading more posts...</span>
            </div>
          )}
          {hasMore && <div ref={loadMoreRef} className="wall-sentinel" aria-hidden="true" />}
        </div>
      )}
    </div>
  );
}

export default Wall;
