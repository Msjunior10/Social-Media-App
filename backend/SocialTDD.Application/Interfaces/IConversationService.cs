using SocialTDD.Application.DTOs;

namespace SocialTDD.Application.Interfaces;

public interface IConversationService
{
    Task<ConversationResponse> CreateGroupConversationAsync(Guid currentUserId, CreateConversationRequest request);
    Task<ConversationResponse> GetOrCreateDirectConversationAsync(Guid currentUserId, Guid otherUserId);
    Task<List<ConversationResponse>> GetMyConversationsAsync(Guid currentUserId);
    Task<List<ConversationMessageResponse>> GetMessagesAsync(Guid currentUserId, Guid conversationId);
    Task<ConversationMessageResponse> SendMessageAsync(Guid currentUserId, Guid conversationId, CreateConversationMessageRequest request);
}
