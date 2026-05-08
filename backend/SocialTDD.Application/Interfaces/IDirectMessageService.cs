using SocialTDD.Application.DTOs;

namespace SocialTDD.Application.Interfaces;

public interface IDirectMessageService
{
    Task<List<DirectMessageResponse>> GetInboxAsync(Guid userId);
    Task<DirectMessageResponse> SendDirectMessageAsync(CreateDirectMessageRequest request);
    Task<List<DirectMessageResponse>> GetConversationAsync(Guid userId, Guid otherUserId);
    Task<List<DirectMessageResponse>> GetReceivedMessagesAsync(Guid userId);
    Task MarkAsReadAsync(Guid messageId, Guid userId);
}

