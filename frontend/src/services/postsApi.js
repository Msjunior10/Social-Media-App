import { authenticatedFetch, handleApiResponse } from '../utils/apiClient';

const API_BASE_URL = 'http://localhost:5000/api';

export const postsApi = {
  // Hämta tidslinje för en användare
  async getTimeline() {
    const response = await authenticatedFetch(`${API_BASE_URL}/posts/timeline`);
    return await handleApiResponse(response);
  },

  // Hämta tidslinje för vald användarprofil
  async getTimelineByUserId(userId) {
    const response = await authenticatedFetch(`${API_BASE_URL}/posts/timeline/${userId}`);
    return await handleApiResponse(response);
  },

  // Skapa ett nytt inlägg
  async createPost(message, imageFile = null) {
    const formData = new FormData();
    formData.append('message', message);
    if (imageFile) {
      formData.append('image', imageFile);
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