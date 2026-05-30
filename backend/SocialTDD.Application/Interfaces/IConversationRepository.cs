using SocialTDD.Domain.Entities;

namespace SocialTDD.Application.Interfaces;

public interface IConversationRepository
{
    Task<Conversation> CreateConversationAsync(Conversation conversation);
    Task<Conversation?> GetDirectConversationAsync(Guid firstUserId, Guid secondUserId);
    Task<Conversation?> GetConversationByIdAsync(Guid conversationId);
    Task<IEnumerable<Conversation>> GetConversationsForUserAsync(Guid userId);
    Task<IEnumerable<ConversationMessage>> GetMessagesAsync(Guid conversationId);
    Task<ConversationMessage> CreateMessageAsync(ConversationMessage message);
    Task<CallSession> CreateCallSessionAsync(CallSession callSession);
    Task<CallSession?> GetActiveCallSessionAsync(Guid conversationId);
    Task UpdateCallSessionAsync(CallSession callSession);
    Task<bool> IsConversationMemberAsync(Guid conversationId, Guid userId);
    Task<bool> UserExistsAsync(Guid userId);
}