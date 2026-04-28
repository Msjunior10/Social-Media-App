import { authenticatedFetch, handleApiResponse } from '../utils/apiClient';

const API_BASE_URL = 'http://localhost:5000/api';

export const userApi = {
  // Hämta användare med ID
  async getUserById(userId) {
    const response = await authenticatedFetch(`${API_BASE_URL}/user/${userId}`);
    return await handleApiResponse(response);
  },

  // Hämta användare med användarnamn
  async getUserByUsername(username) {
    const response = await authenticatedFetch(`${API_BASE_URL}/user/username/${username}`);
    return await handleApiResponse(response);
  },

  // Hämta alla användare
  async getAllUsers() {
    const response = await authenticatedFetch(`${API_BASE_URL}/user`);
    return await handleApiResponse(response);
  },

  // Söka efter användare
  async searchUsers(searchTerm) {
    const response = await authenticatedFetch(`${API_BASE_URL}/user/search?q=${encodeURIComponent(searchTerm)}`);
    return await handleApiResponse(response);
  },
};
