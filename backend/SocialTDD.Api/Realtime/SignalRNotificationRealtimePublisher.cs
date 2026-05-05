using Microsoft.AspNetCore.SignalR;
using SocialTDD.Api.Hubs;
using SocialTDD.Application.DTOs;
using SocialTDD.Application.Interfaces;

namespace SocialTDD.Api.Realtime;

public class SignalRNotificationRealtimePublisher : INotificationRealtimePublisher
{
    private readonly IHubContext<NotificationHub> _hubContext;

    public SignalRNotificationRealtimePublisher(IHubContext<NotificationHub> hubContext)
    {
        _hubContext = hubContext;
    }

    public Task PublishNotificationReceivedAsync(Guid userId, NotificationResponse notification, int unreadCount)
    {
        return _hubContext.Clients.Group(NotificationHub.GetUserGroup(userId)).SendAsync(
            NotificationHub.NotificationReceivedMethod,
            new
            {
                Notification = notification,
                UnreadCount = unreadCount
            });
    }

    public Task PublishNotificationReadAsync(Guid userId, Guid notificationId, int unreadCount)
    {
        return _hubContext.Clients.Group(NotificationHub.GetUserGroup(userId)).SendAsync(
            NotificationHub.NotificationReadMethod,
            new
            {
                NotificationId = notificationId,
                UnreadCount = unreadCount
            });
    }

    public Task PublishNotificationsReadAllAsync(Guid userId, int unreadCount)
    {
        return _hubContext.Clients.Group(NotificationHub.GetUserGroup(userId)).SendAsync(
            NotificationHub.NotificationsReadAllMethod,
            new
            {
                UnreadCount = unreadCount
            });
    }
}