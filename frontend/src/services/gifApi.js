import { authenticatedFetch, handleApiResponse } from '../utils/apiClient';

const API_BASE_URL = 'http://localhost:5000/api';

async function fetchGifEndpoint(path, params = {}) {
  const query = new URLSearchParams(params).toString();
  const response = await authenticatedFetch(`${API_BASE_URL}/gifs/${path}${query ? `?${query}` : ''}`);
  const payload = await handleApiResponse(response);
  return Array.isArray(payload) ? payload : [];
}

export const gifApi = {
  isConfigured() {
    return true;
  },

  async getTrending(limit = 18) {
    return fetchGifEndpoint('trending', { limit: String(limit) });
  },

  async search(query, limit = 18) {
    return fetchGifEndpoint('search', { query, limit: String(limit) });
  },

  async getTrendingSearchTerms() {
    return fetchGifEndpoint('topics');
  },
};