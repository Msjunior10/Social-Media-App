using SocialTDD.Application.DTOs;

namespace SocialTDD.Application.Interfaces;

public interface INotificationService
{
    Task<List<NotificationResponse>> GetNotificationsAsync(Guid userId);
    Task<int> GetUnreadCountAsync(Guid userId);
    Task MarkAsReadAsync(Guid notificationId, Guid userId);
    Task MarkAllAsReadAsync(Guid userId);
    Task CreateFollowNotificationAsync(Guid recipientUserId, Guid actorUserId);
    Task CreatePostLikeNotificationAsync(Guid recipientUserId, Guid actorUserId, Guid postId);
    Task CreatePostCommentNotificationAsync(Guid recipientUserId, Guid actorUserId, Guid postId);
    Task CreatePostMentionNotificationAsync(Guid recipientUserId, Guid actorUserId, Guid postId);
    Task CreateCommentMentionNotificationAsync(Guid recipientUserId, Guid actorUserId, Guid postId);
    Task CreatePostRepostNotificationAsync(Guid recipientUserId, Guid actorUserId, Guid postId);
    Task CreateDirectMessageNotificationAsync(Guid recipientUserId, Guid actorUserId, Guid directMessageId);
}
