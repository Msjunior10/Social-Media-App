using SocialTDD.Domain.Entities;

namespace SocialTDD.Application.Interfaces;

public interface IConversationRepository
{
    Task<Conversation> CreateConversationAsync(Conversation conversation);
    Task<Conversation?> GetConversationByIdAsync(Guid conversationId);
    Task<IEnumerable<Conversation>> GetConversationsForUserAsync(Guid userId);
    Task<IEnumerable<ConversationMessage>> GetMessagesAsync(Guid conversationId);
    Task<ConversationMessage> CreateMessageAsync(ConversationMessage message);
    Task<bool> IsConversationMemberAsync(Guid conversationId, Guid userId);
    Task<bool> UserExistsAsync(Guid userId);
}