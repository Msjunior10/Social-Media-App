using SocialTDD.Application.DTOs;
using SocialTDD.Application.Interfaces;

namespace SocialTDD.Application.Services;

internal sealed class NullNotificationRealtimePublisher : INotificationRealtimePublisher
{
    public Task PublishNotificationReceivedAsync(Guid userId, NotificationResponse notification, int unreadCount)
        => Task.CompletedTask;

    public Task PublishNotificationReadAsync(Guid userId, Guid notificationId, int unreadCount)
        => Task.CompletedTask;

    public Task PublishNotificationsReadAllAsync(Guid userId, int unreadCount)
        => Task.CompletedTask;
}