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
  async createPost(message) {
    const response = await authenticatedFetch(`${API_BASE_URL}/posts`, {
      method: 'POST',
      body: JSON.stringify({
        message: message,
      }),
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
};