using Microsoft.EntityFrameworkCore;
using SocialTDD.Application.Interfaces;
using SocialTDD.Domain.Entities;
using SocialTDD.Infrastructure.Data;

namespace SocialTDD.Infrastructure.Repositories;

public class ConversationRepository : IConversationRepository
{
    private readonly ApplicationDbContext _context;

    public ConversationRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Conversation> CreateConversationAsync(Conversation conversation)
    {
        _context.Conversations.Add(conversation);
        await _context.SaveChangesAsync();
        return conversation;
    }

    public async Task<Conversation?> GetConversationByIdAsync(Guid conversationId)
    {
        return await _context.Conversations
            .Include(conversation => conversation.CreatedByUser)
            .Include(conversation => conversation.Members)
                .ThenInclude(member => member.User)
            .Include(conversation => conversation.Messages)
                .ThenInclude(message => message.Sender)
            .Include(conversation => conversation.CallSessions)
            .FirstOrDefaultAsync(conversation => conversation.Id == conversationId);
    }

    public async Task<IEnumerable<Conversation>> GetConversationsForUserAsync(Guid userId)
    {
        return await _context.ConversationMembers
            .Where(member => member.UserId == userId)
            .Select(member => member.Conversation)
            .Include(conversation => conversation.CreatedByUser)
            .Include(conversation => conversation.Members)
                .ThenInclude(member => member.User)
            .OrderByDescending(conversation => conversation.CreatedAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<ConversationMessage>> GetMessagesAsync(Guid conversationId)
    {
        return await _context.ConversationMessages
            .Include(message => message.Sender)
            .Where(message => message.ConversationId == conversationId)
            .OrderBy(message => message.CreatedAt)
            .ToListAsync();
    }

    public async Task<ConversationMessage> CreateMessageAsync(ConversationMessage message)
    {
        _context.ConversationMessages.Add(message);
        await _context.SaveChangesAsync();
        return message;
    }

    public async Task<bool> IsConversationMemberAsync(Guid conversationId, Guid userId)
    {
        return await _context.ConversationMembers
            .AnyAsync(member => member.ConversationId == conversationId && member.UserId == userId);
    }

    public async Task<bool> UserExistsAsync(Guid userId)
    {
        return await _context.Users.AnyAsync(user => user.Id == userId);
    }
}