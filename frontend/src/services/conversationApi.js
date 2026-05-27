import { authenticatedFetch, handleApiResponse } from '../utils/apiClient';

const API_BASE_URL = 'http://localhost:5000/api';

export const conversationApi = {
  async getMyConversations() {
    const response = await authenticatedFetch(`${API_BASE_URL}/conversations`);
    return await handleApiResponse(response);
  },

  async createConversation(title, memberIds) {
    const response = await authenticatedFetch(`${API_BASE_URL}/conversations`, {
      method: 'POST',
      body: JSON.stringify({ title, memberIds }),
    });

    return await handleApiResponse(response);
  },

  async getMessages(conversationId) {
    const response = await authenticatedFetch(`${API_BASE_URL}/conversations/${conversationId}/messages`);
    return await handleApiResponse(response);
  },

  async sendMessage(conversationId, message) {
    const response = await authenticatedFetch(`${API_BASE_URL}/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });

    return await handleApiResponse(response);
  },
};
