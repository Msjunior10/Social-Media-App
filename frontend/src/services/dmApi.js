import { authenticatedFetch, handleApiResponse } from '../utils/apiClient';

const API_BASE_URL = 'http://localhost:5000/api';

export const dmApi = {
  async getInboxMessages() {
    const response = await authenticatedFetch(`${API_BASE_URL}/directmessages`);

    try {
      return await handleApiResponse(response);
    } catch (error) {
      if (error?.statusCode === 404) {
        return await dmApi.getReceivedMessages();
      }

      throw error;
    }
  },

  // Skicka ett direktmeddelande
  async sendDirectMessage(recipientId, message) {
    const response = await authenticatedFetch(`${API_BASE_URL}/directmessages`, {
      method: 'POST',
      body: JSON.stringify({
        recipientId,
        message,
      }),
    });
    return await handleApiResponse(response);
  },

  // Hämta mottagna meddelanden för en användare
  async getReceivedMessages() {
    const response = await authenticatedFetch(`${API_BASE_URL}/directmessages/received`);
    return await handleApiResponse(response);
  },

  async getConversation(otherUserId) {
    const response = await authenticatedFetch(`${API_BASE_URL}/directmessages/conversation/${otherUserId}`);
    return await handleApiResponse(response);
  },

  // Markera ett meddelande som läst
  async markAsRead(messageId) {
    const response = await authenticatedFetch(`${API_BASE_URL}/directmessages/${messageId}/read`, {
      method: 'PUT',
    });
    return await handleApiResponse(response);
  },
};