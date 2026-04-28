import { authenticatedFetch, handleApiResponse } from '../utils/apiClient';

const API_BASE_URL = 'http://localhost:5000/api';

export const wallApi = {
  // Hämta vägg (posts från följda användare)
  async getWall() {
    const response = await authenticatedFetch(`${API_BASE_URL}/wall`);
    return await handleApiResponse(response);
  },
};