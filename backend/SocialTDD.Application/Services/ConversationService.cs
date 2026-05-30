using SocialTDD.Application.DTOs;
using SocialTDD.Application.Interfaces;
using SocialTDD.Domain.Entities;

namespace SocialTDD.Application.Services;

public class ConversationService : IConversationService
{
    private readonly IConversationRepository _conversationRepository;
    private readonly INotificationService _notificationService;

    public ConversationService(IConversationRepository conversationRepository, INotificationService notificationService)
    {
        _conversationRepository = conversationRepository;
        _notificationService = notificationService;
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

        foreach (var memberId in allMemberIds.Where(memberId => memberId != currentUserId))
        {
            await _notificationService.CreateGroupConversationNotificationAsync(memberId, currentUserId);
        }

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

    public async Task<ConversationResponse> GetOrCreateDirectConversationAsync(Guid currentUserId, Guid otherUserId)
    {
        if (otherUserId == Guid.Empty)
        {
            throw new ArgumentException("Mottagare måste anges.", nameof(otherUserId));
        }

        if (otherUserId == currentUserId)
        {
            throw new ArgumentException("Du kan inte skapa en direktkonversation med dig själv.", nameof(otherUserId));
        }

        var currentUserExists = await _conversationRepository.UserExistsAsync(currentUserId);
        if (!currentUserExists)
        {
            throw new ArgumentException($"Användare med ID {currentUserId} finns inte.", nameof(currentUserId));
        }

        var otherUserExists = await _conversationRepository.UserExistsAsync(otherUserId);
        if (!otherUserExists)
        {
            throw new ArgumentException($"Användare med ID {otherUserId} finns inte.", nameof(otherUserId));
        }

        var existingConversation = await _conversationRepository.GetDirectConversationAsync(currentUserId, otherUserId);
        if (existingConversation != null)
        {
            return MapConversation(existingConversation);
        }

        var createdAt = DateTime.UtcNow;
        var directConversation = new Conversation
        {
            Id = Guid.NewGuid(),
            CreatedByUserId = currentUserId,
            Title = "Direct conversation",
            IsGroup = false,
            CreatedAt = createdAt,
            Members = new List<ConversationMember>
            {
                new()
                {
                    Id = Guid.NewGuid(),
                    ConversationId = Guid.Empty,
                    UserId = currentUserId,
                    JoinedAt = createdAt,
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    ConversationId = Guid.Empty,
                    UserId = otherUserId,
                    JoinedAt = createdAt,
                }
            }
        };

        var createdConversation = await _conversationRepository.CreateConversationAsync(directConversation);
        var hydratedConversation = await _conversationRepository.GetConversationByIdAsync(createdConversation.Id) ?? createdConversation;
        return MapConversation(hydratedConversation);
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
        var mediaUrl = string.IsNullOrWhiteSpace(request.MediaUrl) ? null : request.MediaUrl.Trim();
        var gifUrl = string.IsNullOrWhiteSpace(request.GifUrl) ? null : request.GifUrl.Trim();

        if (string.IsNullOrWhiteSpace(messageText) && string.IsNullOrWhiteSpace(mediaUrl) && string.IsNullOrWhiteSpace(gifUrl))
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
            MediaUrl = mediaUrl,
            GifUrl = gifUrl,
            CreatedAt = DateTime.UtcNow,
            IsSystemMessage = false
        };

        var createdMessage = await _conversationRepository.CreateMessageAsync(message);
        var messages = await _conversationRepository.GetMessagesAsync(conversationId);
        var hydratedMessage = messages.FirstOrDefault(m => m.Id == createdMessage.Id) ?? createdMessage;

        var conversation = await _conversationRepository.GetConversationByIdAsync(conversationId);
        if (conversation?.IsGroup == true)
        {
            foreach (var memberId in conversation.Members
                         .Select(member => member.UserId)
                         .Where(memberId => memberId != currentUserId))
            {
                await _notificationService.CreateGroupMessageNotificationAsync(memberId, currentUserId, conversationId);
            }
        }

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
