import { authenticatedFetch, handleApiResponse } from '../utils/apiClient';

const API_BASE_URL = 'http://localhost:5000/api';

export const conversationApi = {
  async getMyConversations() {
    const response = await authenticatedFetch(`${API_BASE_URL}/conversations`);
    return await handleApiResponse(response);
  },

  async getOrCreateDirectConversation(otherUserId) {
    const response = await authenticatedFetch(`${API_BASE_URL}/conversations/direct/${otherUserId}`);
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

  async sendMessage(conversationId, message, mediaFile = null, gifUrl = null) {
    const formData = new FormData();
    formData.append('message', message ?? '');

    if (mediaFile) {
      formData.append('media', mediaFile);
    }

    if (gifUrl) {
      formData.append('gifUrl', gifUrl);
    }

    const response = await authenticatedFetch(`${API_BASE_URL}/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: formData,
    });

    return await handleApiResponse(response);
  },
};
