import { authenticatedFetch, handleApiResponse } from '../utils/apiClient';

const API_BASE_URL = 'http://localhost:5000/api';

export const postsApi = {
  // Hämta tidslinje för en användare
  async getTimeline() {
    const response = await authenticatedFetch(`${API_BASE_URL}/posts/timeline`);
    return await handleApiResponse(response);
  },

  // Skapa ett nytt inlägg
  async createPost(recipientId, message) {
    const response = await authenticatedFetch(`${API_BASE_URL}/posts`, {
      method: 'POST',
      body: JSON.stringify({
        recipientId: recipientId,
        message: message,
      }),
    });
    return await handleApiResponse(response);
  },
};