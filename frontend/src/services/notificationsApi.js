import { authenticatedFetch, handleApiResponse } from '../utils/apiClient';

const API_BASE_URL = 'http://localhost:5000/api';

export const notificationsApi = {
  async getNotifications() {
    const response = await authenticatedFetch(`${API_BASE_URL}/notifications`);
    return await handleApiResponse(response);
  },

  async getUnreadCount() {
    const response = await authenticatedFetch(`${API_BASE_URL}/notifications/unread-count`);
    return await handleApiResponse(response);
  },

  async markAsRead(notificationId) {
    const response = await authenticatedFetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
      method: 'PUT',
    });
    return await handleApiResponse(response);
  },

  async markAllAsRead() {
    const response = await authenticatedFetch(`${API_BASE_URL}/notifications/read-all`, {
      method: 'PUT',
    });
    return await handleApiResponse(response);
  },
};
