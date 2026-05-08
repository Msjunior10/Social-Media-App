using SocialTDD.Application.DTOs;
using SocialTDD.Application.Interfaces;

namespace SocialTDD.Application.Services;

internal sealed class NullNotificationService : INotificationService
{
    public Task<List<NotificationResponse>> GetNotificationsAsync(Guid userId)
        => Task.FromResult(new List<NotificationResponse>());

    public Task<int> GetUnreadCountAsync(Guid userId)
        => Task.FromResult(0);

    public Task MarkAsReadAsync(Guid notificationId, Guid userId)
        => Task.CompletedTask;

    public Task MarkAllAsReadAsync(Guid userId)
        => Task.CompletedTask;

    public Task CreateFollowNotificationAsync(Guid recipientUserId, Guid actorUserId)
        => Task.CompletedTask;

    public Task CreatePostLikeNotificationAsync(Guid recipientUserId, Guid actorUserId, Guid postId)
        => Task.CompletedTask;

    public Task CreatePostCommentNotificationAsync(Guid recipientUserId, Guid actorUserId, Guid postId)
        => Task.CompletedTask;

    public Task CreatePostMentionNotificationAsync(Guid recipientUserId, Guid actorUserId, Guid postId)
        => Task.CompletedTask;

    public Task CreateCommentMentionNotificationAsync(Guid recipientUserId, Guid actorUserId, Guid postId)
        => Task.CompletedTask;

    public Task CreatePostRepostNotificationAsync(Guid recipientUserId, Guid actorUserId, Guid postId)
        => Task.CompletedTask;

    public Task CreateDirectMessageNotificationAsync(Guid recipientUserId, Guid actorUserId, Guid directMessageId)
        => Task.CompletedTask;
}
