import { authenticatedFetch, handleApiResponse } from '../utils/apiClient';

const API_BASE_URL = 'http://localhost:5000/api';

export const followApi = {
  // Följa en användare
  async followUser(followingId) {
    const response = await authenticatedFetch(`${API_BASE_URL}/follow`, {
      method: 'POST',
      body: JSON.stringify({
        followingId,
      }),
    });
    return await handleApiResponse(response);
  },

  // Avfölja en användare
  async unfollowUser(followingId) {
    const response = await authenticatedFetch(`${API_BASE_URL}/follow/${followingId}`, {
      method: 'DELETE',
    });
    return await handleApiResponse(response);
  },

  // Hämta följare för en användare
  async getFollowers(userId) {
    const response = await authenticatedFetch(`${API_BASE_URL}/follow/followers/${userId}`);
    return await handleApiResponse(response);
  },

  // Hämta följda användare för en användare
  async getFollowing(userId) {
    const response = await authenticatedFetch(`${API_BASE_URL}/follow/following/${userId}`);
    return await handleApiResponse(response);
  },
};