using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace SocialTDD.Api.Hubs;

[Authorize]
public class NotificationHub : Hub
{
    public const string NotificationReceivedMethod = "notificationReceived";
    public const string NotificationReadMethod = "notificationRead";
    public const string NotificationsReadAllMethod = "notificationsReadAll";

    public override async Task OnConnectedAsync()
    {
        var userId = Context.UserIdentifier;
        if (!string.IsNullOrWhiteSpace(userId))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, GetUserGroup(userId));
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = Context.UserIdentifier;
        if (!string.IsNullOrWhiteSpace(userId))
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, GetUserGroup(userId));
        }

        await base.OnDisconnectedAsync(exception);
    }

    public static string GetUserGroup(Guid userId) => GetUserGroup(userId.ToString());

    public static string GetUserGroup(string userId) => $"notifications:{userId}";
}