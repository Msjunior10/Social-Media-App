using SocialTDD.Application.DTOs;
using SocialTDD.Application.Interfaces;
using SocialTDD.Domain.Entities;

namespace SocialTDD.Application.Services;

public class NotificationService : INotificationService
{
    private const string FollowType = "follow";
    private const string PostLikeType = "post_like";
    private const string PostCommentType = "post_comment";
    private const string PostMentionType = "post_mention";
    private const string CommentMentionType = "comment_mention";
    private const string PostRepostType = "post_repost";
    private const string DirectMessageType = "direct_message";

    private readonly INotificationRepository _notificationRepository;
    private readonly INotificationRealtimePublisher _realtimePublisher;

    public NotificationService(
        INotificationRepository notificationRepository,
        INotificationRealtimePublisher? realtimePublisher = null)
    {
        _notificationRepository = notificationRepository;
        _realtimePublisher = realtimePublisher ?? new NullNotificationRealtimePublisher();
    }

    public async Task<List<NotificationResponse>> GetNotificationsAsync(Guid userId)
    {
        var userExists = await _notificationRepository.UserExistsAsync(userId);
        if (!userExists)
        {
            throw new ArgumentException($"Användare med ID {userId} finns inte.", nameof(userId));
        }

        var notifications = await _notificationRepository.GetByUserIdAsync(userId);
        return notifications.Select(MapToResponse).ToList();
    }

    public async Task<int> GetUnreadCountAsync(Guid userId)
    {
        var userExists = await _notificationRepository.UserExistsAsync(userId);
        if (!userExists)
        {
            throw new ArgumentException($"Användare med ID {userId} finns inte.", nameof(userId));
        }

        return await _notificationRepository.GetUnreadCountAsync(userId);
    }

    public async Task MarkAsReadAsync(Guid notificationId, Guid userId)
    {
        var notification = await _notificationRepository.GetByIdAsync(notificationId);
        if (notification == null || notification.UserId != userId)
        {
            throw new KeyNotFoundException($"Notis med ID {notificationId} finns inte.");
        }

        await _notificationRepository.MarkAsReadAsync(notificationId, userId);
        var unreadCount = await _notificationRepository.GetUnreadCountAsync(userId);
        await _realtimePublisher.PublishNotificationReadAsync(userId, notificationId, unreadCount);
    }

    public async Task MarkAllAsReadAsync(Guid userId)
    {
        var userExists = await _notificationRepository.UserExistsAsync(userId);
        if (!userExists)
        {
            throw new ArgumentException($"Användare med ID {userId} finns inte.", nameof(userId));
        }

        await _notificationRepository.MarkAllAsReadAsync(userId);
        await _realtimePublisher.PublishNotificationsReadAllAsync(userId, 0);
    }

    public Task CreateFollowNotificationAsync(Guid recipientUserId, Guid actorUserId)
    {
        return CreateNotificationAsync(recipientUserId, actorUserId, FollowType, null, null);
    }

    public Task CreatePostLikeNotificationAsync(Guid recipientUserId, Guid actorUserId, Guid postId)
    {
        return CreateNotificationAsync(recipientUserId, actorUserId, PostLikeType, postId, null);
    }

    public Task CreatePostCommentNotificationAsync(Guid recipientUserId, Guid actorUserId, Guid postId)
    {
        return CreateNotificationAsync(recipientUserId, actorUserId, PostCommentType, postId, null);
    }

    public Task CreatePostMentionNotificationAsync(Guid recipientUserId, Guid actorUserId, Guid postId)
    {
        return CreateNotificationAsync(recipientUserId, actorUserId, PostMentionType, postId, null);
    }

    public Task CreateCommentMentionNotificationAsync(Guid recipientUserId, Guid actorUserId, Guid postId)
    {
        return CreateNotificationAsync(recipientUserId, actorUserId, CommentMentionType, postId, null);
    }

    public Task CreatePostRepostNotificationAsync(Guid recipientUserId, Guid actorUserId, Guid postId)
    {
        return CreateNotificationAsync(recipientUserId, actorUserId, PostRepostType, postId, null);
    }

    public Task CreateDirectMessageNotificationAsync(Guid recipientUserId, Guid actorUserId, Guid directMessageId)
    {
        return CreateNotificationAsync(recipientUserId, actorUserId, DirectMessageType, null, directMessageId);
    }

    private async Task CreateNotificationAsync(Guid recipientUserId, Guid actorUserId, string type, Guid? postId, Guid? directMessageId)
    {
        if (recipientUserId == actorUserId)
        {
            return;
        }

        var recipientExists = await _notificationRepository.UserExistsAsync(recipientUserId);
        var actorExists = await _notificationRepository.UserExistsAsync(actorUserId);
        if (!recipientExists || !actorExists)
        {
            return;
        }

        var notification = new Notification
        {
            Id = Guid.NewGuid(),
            UserId = recipientUserId,
            ActorId = actorUserId,
            Type = type,
            PostId = postId,
            DirectMessageId = directMessageId,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        };

        await _notificationRepository.CreateAsync(notification);

        var createdNotification = await _notificationRepository.GetByIdAsync(notification.Id) ?? notification;
        var notificationResponse = MapToResponse(createdNotification);
        var unreadCount = await _notificationRepository.GetUnreadCountAsync(recipientUserId);

        await _realtimePublisher.PublishNotificationReceivedAsync(recipientUserId, notificationResponse, unreadCount);
    }

    private NotificationResponse MapToResponse(Notification notification)
    {
        var actorUsername = notification.Actor?.Username ?? string.Empty;

        return new NotificationResponse
        {
            Id = notification.Id,
            Type = notification.Type,
            UserId = notification.UserId,
            ActorId = notification.ActorId,
            ActorUsername = actorUsername,
            PostId = notification.PostId,
            DirectMessageId = notification.DirectMessageId,
            Message = BuildMessage(notification.Type, actorUsername),
            IsRead = notification.IsRead,
            CreatedAt = notification.CreatedAt
        };
    }

    private static string BuildMessage(string type, string actorUsername)
    {
        var safeActor = string.IsNullOrWhiteSpace(actorUsername) ? "Någon" : actorUsername;

        return type switch
        {
            FollowType => $"{safeActor} började följa dig.",
            PostLikeType => $"{safeActor} gillade ditt inlägg.",
            PostCommentType => $"{safeActor} kommenterade ditt inlägg.",
            PostMentionType => $"{safeActor} nämnde dig i ett inlägg.",
            CommentMentionType => $"{safeActor} nämnde dig i en kommentar.",
            PostRepostType => $"{safeActor} återpublicerade ditt inlägg.",
            DirectMessageType => $"{safeActor} skickade ett direktmeddelande.",
            _ => $"{safeActor} har ny aktivitet för dig."
        };
    }
}
