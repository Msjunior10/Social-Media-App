import { authenticatedFetch, handleApiResponse } from '../utils/apiClient';

const API_BASE_URL = 'http://localhost:5000/api';
const API_ORIGIN = API_BASE_URL.replace(/\/api$/, '');

function resolveMediaUrl(mediaUrl) {
  if (!mediaUrl) {
    return '';
  }

  if (/^https?:\/\//i.test(mediaUrl)) {
    return mediaUrl;
  }

  return `${API_ORIGIN}${mediaUrl.startsWith('/') ? '' : '/'}${mediaUrl}`;
}

export const dmApi = {
  resolveMediaUrl,

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
  async sendDirectMessage(recipientId, message, mediaFile = null) {
    const formData = new FormData();
    formData.append('recipientId', recipientId);
    formData.append('message', message ?? '');
    if (mediaFile) {
      formData.append('media', mediaFile);
    }

    const response = await authenticatedFetch(`${API_BASE_URL}/directmessages`, {
      method: 'POST',
      body: formData,
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