using SocialTDD.Application.DTOs;

namespace SocialTDD.Application.Interfaces;

public interface INotificationRealtimePublisher
{
    Task PublishNotificationReceivedAsync(Guid userId, NotificationResponse notification, int unreadCount);
    Task PublishNotificationReadAsync(Guid userId, Guid notificationId, int unreadCount);
    Task PublishNotificationsReadAllAsync(Guid userId, int unreadCount);
}