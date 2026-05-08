import React, { useState, useEffect, useCallback, useRef } from 'react';
import { postsApi } from '../services/postsApi';
import { userApi } from '../services/userApi';
import { ApiError, ErrorCodes } from '../utils/ApiError';
import PostItem from './PostItem';
import './Timeline.css';

function Timeline({ userId, refreshKey = 0, showHeader = true }) {
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

  const loadUsernames = useCallback(async (timelinePosts) => {
    const uniqueUserIds = new Set();

    timelinePosts.forEach(post => {
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

  const fetchTimelinePage = useCallback(async (targetPage, replace = false) => {
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
      const timelinePage = await postsApi.getTimelinePage(targetPage, PAGE_SIZE);
      const incomingPosts = [...timelinePage.items].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      setPosts(current => {
        if (replace) {
          return incomingPosts;
        }

        const seen = new Set(current.map(post => post.id));
        return current.concat(incomingPosts.filter(post => !seen.has(post.id)));
      });
      setPage(timelinePage.page);
      setHasMore(timelinePage.hasMore);
      await loadUsernames(incomingPosts);
    } catch (err) {
      if (err instanceof ApiError) {
        switch (err.errorCode) {
          case ErrorCodes.TOKEN_EXPIRED:
            setError('Your session has expired. Please sign in again.');
            break;
          case ErrorCodes.NETWORK_ERROR:
            setError('Could not connect to the server. Check your internet connection.');
            break;
          case ErrorCodes.TIMEOUT_ERROR:
            setError('The request took too long. Please try again.');
            break;
          case ErrorCodes.INVALID_USER_ID:
            setError('Invalid user ID.');
            break;
          default:
            setError(err.message || 'Could not fetch timeline');
        }
      } else {
        setError(err.message || 'Could not fetch timeline');
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [userId, loadUsernames]);

  const refreshTimeline = useCallback(async () => {
    setPosts([]);
    setUsernames({});
    setPage(1);
    setHasMore(false);
    await fetchTimelinePage(1, true);
  }, [fetchTimelinePage]);

  const loadMoreTimeline = useCallback(async () => {
    if (!hasMore || loading || loadingMore) {
      return;
    }

    await fetchTimelinePage(page + 1, false);
  }, [fetchTimelinePage, hasMore, loading, loadingMore, page]);

  useEffect(() => {
    if (userId) {
      refreshTimeline();
    }
  }, [userId, refreshTimeline, refreshKey]);

  useEffect(() => {
    if (!loadMoreRef.current || !hasMore) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMoreTimeline();
        }
      },
      { rootMargin: '240px 0px' }
    );

    observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, [hasMore, loadMoreTimeline]);

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
      <div className="timeline">
        <div className="timeline-header">
          {showHeader && <h3>Timeline</h3>}
        </div>
        <div className="timeline-skeleton-list" aria-hidden="true">
          {skeletonItems.map((item) => (
            <div key={item} className="timeline-skeleton-item">
              <div className="timeline-skeleton-avatar" />
              <div className="timeline-skeleton-body">
                <div className="timeline-skeleton-row timeline-skeleton-row-short" />
                <div className="timeline-skeleton-row" />
                <div className="timeline-skeleton-row timeline-skeleton-row-medium" />
                <div className="timeline-skeleton-chips">
                  <span className="timeline-skeleton-chip" />
                  <span className="timeline-skeleton-chip" />
                  <span className="timeline-skeleton-chip" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="timeline">
      {showHeader && (
        <div className="timeline-header">
          <div className="timeline-title-group">
            <h3>Timeline</h3>
            <span className="timeline-count-badge">{posts.length} loaded</span>
          </div>
          <button
            onClick={refreshTimeline}
            className="timeline-refresh-button"
            disabled={loading || loadingMore}
            title="Refresh timeline"
            aria-label="Refresh timeline"
          >
            <span className={loading || loadingMore ? 'refresh-icon spinning' : 'refresh-icon'}>⟳</span>
          </button>
        </div>
      )}
      
      {error && (
        <div className="error-message" role="alert">
          <span className="error-icon">⚠️</span>
          <span className="error-text">{error}</span>
          <button onClick={refreshTimeline} className="error-retry-button">
            Try again
          </button>
        </div>
      )}

      {posts.length === 0 && !loading && !error ? (
        <div className="empty-message">
          <p>No posts to show in the timeline.</p>
          <p className="empty-hint">Create your first public post and it will appear here.</p>
        </div>
      ) : (
        <div className="timeline-posts">
          {posts.map((post) => (
            <PostItem
              key={post.id}
              post={post}
              usernames={usernames}
              currentUserId={userId}
              formatDate={formatDate}
              isPublicPost={isPublicPost}
              onPostChanged={refreshTimeline}
              containerClassName="post-item"
            />
          ))}
          {loadingMore && (
            <div className="timeline-load-more">
              <span className="loading-spinner"></span>
              <span>Loading more posts...</span>
            </div>
          )}
          {hasMore && <div ref={loadMoreRef} className="timeline-sentinel" aria-hidden="true" />}
        </div>
      )}
    </div>
  );
}

export default Timeline;