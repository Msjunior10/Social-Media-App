import { authenticatedFetch, handleApiResponse } from '../utils/apiClient';

const API_BASE_URL = 'http://localhost:5000/api';

function normalizePagedResponse(payload) {
  if (Array.isArray(payload)) {
    return {
      items: payload,
      page: 1,
      pageSize: payload.length,
      totalCount: payload.length,
      hasMore: false,
    };
  }

  return {
    items: payload.items ?? [],
    page: payload.page ?? 1,
    pageSize: payload.pageSize ?? 0,
    totalCount: payload.totalCount ?? 0,
    hasMore: payload.hasMore ?? false,
  };
}

async function fetchAllPages(fetchPage) {
  const firstPage = await fetchPage(1);
  let items = [...firstPage.items];
  let currentPage = firstPage.page;
  let hasMore = firstPage.hasMore;

  while (hasMore) {
    currentPage += 1;
    const nextPage = await fetchPage(currentPage);
    items = items.concat(nextPage.items);
    hasMore = nextPage.hasMore;
  }

  return items;
}

export const postsApi = {
  async getPostById(postId) {
    const response = await authenticatedFetch(`${API_BASE_URL}/posts/${postId}`);
    return await handleApiResponse(response);
  },

  // Hämta tidslinje för en användare
  async getTimeline() {
    return await fetchAllPages((page) => this.getTimelinePage(page, 10));
  },

  async getTimelinePage(page = 1, pageSize = 10) {
    const response = await authenticatedFetch(`${API_BASE_URL}/posts/timeline?page=${page}&pageSize=${pageSize}`);
    const payload = await handleApiResponse(response);
    return normalizePagedResponse(payload);
  },

  // Hämta tidslinje för vald användarprofil
  async getTimelineByUserId(userId) {
    return await fetchAllPages((page) => this.getTimelineByUserIdPage(userId, page, 10));
  },

  async getTimelineByUserIdPage(userId, page = 1, pageSize = 10) {
    const response = await authenticatedFetch(`${API_BASE_URL}/posts/timeline/${userId}?page=${page}&pageSize=${pageSize}`);
    const payload = await handleApiResponse(response);
    return normalizePagedResponse(payload);
  },

  // Skapa ett nytt inlägg
  async createPost(message, mediaFile = null) {
    const formData = new FormData();
    formData.append('message', message);
    if (mediaFile) {
      formData.append('image', mediaFile);
    }

    const response = await authenticatedFetch(`${API_BASE_URL}/posts`, {
      method: 'POST',
      body: formData,
    });
    return await handleApiResponse(response);
  },

  async updatePost(postId, message) {
    const response = await authenticatedFetch(`${API_BASE_URL}/posts/${postId}`, {
      method: 'PUT',
      body: JSON.stringify({
        message,
      }),
    });
    return await handleApiResponse(response);
  },

  async deletePost(postId) {
    const response = await authenticatedFetch(`${API_BASE_URL}/posts/${postId}`, {
      method: 'DELETE',
    });
    return await handleApiResponse(response);
  },

  async likePost(postId) {
    const response = await authenticatedFetch(`${API_BASE_URL}/posts/${postId}/likes`, {
      method: 'POST',
    });
    return await handleApiResponse(response);
  },

  async unlikePost(postId) {
    const response = await authenticatedFetch(`${API_BASE_URL}/posts/${postId}/likes`, {
      method: 'DELETE',
    });
    return await handleApiResponse(response);
  },

  async repostPost(postId) {
    const response = await authenticatedFetch(`${API_BASE_URL}/posts/${postId}/repost`, {
      method: 'POST',
    });
    return await handleApiResponse(response);
  },

  async removeRepost(postId) {
    const response = await authenticatedFetch(`${API_BASE_URL}/posts/${postId}/repost`, {
      method: 'DELETE',
    });
    return await handleApiResponse(response);
  },

  async addComment(postId, message) {
    const response = await authenticatedFetch(`${API_BASE_URL}/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
    return await handleApiResponse(response);
  },

  async deleteComment(postId, commentId) {
    const response = await authenticatedFetch(`${API_BASE_URL}/posts/${postId}/comments/${commentId}`, {
      method: 'DELETE',
    });
    return await handleApiResponse(response);
  },

  async updateComment(postId, commentId, message) {
    const response = await authenticatedFetch(`${API_BASE_URL}/posts/${postId}/comments/${commentId}`, {
      method: 'PUT',
      body: JSON.stringify({ message }),
    });
    return await handleApiResponse(response);
  },

  async getSavedPosts() {
    const response = await authenticatedFetch(`${API_BASE_URL}/posts/saved`);
    return await handleApiResponse(response);
  },

  async bookmarkPost(postId) {
    const response = await authenticatedFetch(`${API_BASE_URL}/posts/${postId}/bookmark`, {
      method: 'POST',
    });
    return await handleApiResponse(response);
  },

  async removeBookmark(postId) {
    const response = await authenticatedFetch(`${API_BASE_URL}/posts/${postId}/bookmark`, {
      method: 'DELETE',
    });
    return await handleApiResponse(response);
  },
};