using SocialTDD.Application.DTOs;
using SocialTDD.Application.Interfaces;
using SocialTDD.Domain.Entities;

namespace SocialTDD.Application.Services;

public class ConversationService : IConversationService
{
    private readonly IConversationRepository _conversationRepository;

    public ConversationService(IConversationRepository conversationRepository)
    {
        _conversationRepository = conversationRepository;
    }

    public async Task<ConversationResponse> CreateGroupConversationAsync(Guid currentUserId, CreateConversationRequest request)
    {
        if (request == null)
        {
            throw new ArgumentException("Request body saknas.", nameof(request));
        }

        var title = request.Title?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(title))
        {
            throw new ArgumentException("Titel är obligatorisk.", nameof(request.Title));
        }

        var requestedMemberIds = request.MemberIds ?? new List<Guid>();
        var allMemberIds = requestedMemberIds
            .Append(currentUserId)
            .Where(id => id != Guid.Empty)
            .Distinct()
            .ToList();

        if (allMemberIds.Count < 2)
        {
            throw new ArgumentException("En gruppkonversation måste innehålla minst två medlemmar.", nameof(request.MemberIds));
        }

        foreach (var memberId in allMemberIds)
        {
            var exists = await _conversationRepository.UserExistsAsync(memberId);
            if (!exists)
            {
                throw new ArgumentException($"Användare med ID {memberId} finns inte.", nameof(request.MemberIds));
            }
        }

        var createdAt = DateTime.UtcNow;
        var conversation = new Conversation
        {
            Id = Guid.NewGuid(),
            CreatedByUserId = currentUserId,
            Title = title,
            IsGroup = true,
            CreatedAt = createdAt,
            Members = allMemberIds.Select(memberId => new ConversationMember
            {
                Id = Guid.NewGuid(),
                ConversationId = Guid.Empty,
                UserId = memberId,
                JoinedAt = createdAt
            }).ToList()
        };

        var createdConversation = await _conversationRepository.CreateConversationAsync(conversation);
        var hydratedConversation = await _conversationRepository.GetConversationByIdAsync(createdConversation.Id) ?? createdConversation;

        return MapConversation(hydratedConversation);
    }

    public async Task<List<ConversationResponse>> GetMyConversationsAsync(Guid currentUserId)
    {
        var userExists = await _conversationRepository.UserExistsAsync(currentUserId);
        if (!userExists)
        {
            throw new ArgumentException($"Användare med ID {currentUserId} finns inte.", nameof(currentUserId));
        }

        var conversations = await _conversationRepository.GetConversationsForUserAsync(currentUserId);
        return conversations.Select(MapConversation).ToList();
    }

    public async Task<List<ConversationMessageResponse>> GetMessagesAsync(Guid currentUserId, Guid conversationId)
    {
        var isMember = await _conversationRepository.IsConversationMemberAsync(conversationId, currentUserId);
        if (!isMember)
        {
            throw new UnauthorizedAccessException("Du är inte medlem i den här konversationen.");
        }

        var messages = await _conversationRepository.GetMessagesAsync(conversationId);
        return messages.Select(MapMessage).ToList();
    }

    public async Task<ConversationMessageResponse> SendMessageAsync(Guid currentUserId, Guid conversationId, CreateConversationMessageRequest request)
    {
        if (request == null)
        {
            throw new ArgumentException("Request body saknas.", nameof(request));
        }

        var messageText = request.Message?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(messageText))
        {
            throw new ArgumentException("Meddelande får inte vara tomt.", nameof(request.Message));
        }

        var isMember = await _conversationRepository.IsConversationMemberAsync(conversationId, currentUserId);
        if (!isMember)
        {
            throw new UnauthorizedAccessException("Du är inte medlem i den här konversationen.");
        }

        var message = new ConversationMessage
        {
            Id = Guid.NewGuid(),
            ConversationId = conversationId,
            SenderId = currentUserId,
            Message = messageText,
            CreatedAt = DateTime.UtcNow,
            IsSystemMessage = false
        };

        var createdMessage = await _conversationRepository.CreateMessageAsync(message);
        var messages = await _conversationRepository.GetMessagesAsync(conversationId);
        var hydratedMessage = messages.FirstOrDefault(m => m.Id == createdMessage.Id) ?? createdMessage;

        return MapMessage(hydratedMessage);
    }

    private static ConversationResponse MapConversation(Conversation conversation)
    {
        return new ConversationResponse
        {
            Id = conversation.Id,
            Title = conversation.Title,
            IsGroup = conversation.IsGroup,
            CreatedAt = conversation.CreatedAt,
            Members = conversation.Members
                .OrderBy(member => member.JoinedAt)
                .Select(member => new ConversationMemberResponse
                {
                    UserId = member.UserId,
                    Username = member.User?.Username ?? string.Empty,
                    JoinedAt = member.JoinedAt
                })
                .ToList()
        };
    }

    private static ConversationMessageResponse MapMessage(ConversationMessage message)
    {
        return new ConversationMessageResponse
        {
            Id = message.Id,
            ConversationId = message.ConversationId,
            SenderId = message.SenderId,
            SenderUsername = message.Sender?.Username ?? string.Empty,
            Message = message.Message,
            MediaUrl = message.MediaUrl,
            GifUrl = message.GifUrl,
            CreatedAt = message.CreatedAt
        };
    }
}
