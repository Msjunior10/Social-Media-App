using FluentValidation;
using SocialTDD.Application.DTOs;
using SocialTDD.Application.Interfaces;
using SocialTDD.Domain.Entities;

namespace SocialTDD.Application.Services;

public class DirectMessageService : IDirectMessageService
{
    private readonly IDirectMessageRepository _directMessageRepository;
    private readonly IValidator<CreateDirectMessageRequest> _validator;

    public DirectMessageService(
        IDirectMessageRepository directMessageRepository,
        IValidator<CreateDirectMessageRequest> validator)
    {
        _directMessageRepository = directMessageRepository;
        _validator = validator;
    }

    public async Task<DirectMessageResponse> SendDirectMessageAsync(CreateDirectMessageRequest request)
    {
        // Validera input
        var validationResult = await _validator.ValidateAsync(request);
        if (!validationResult.IsValid)
        {
            throw new ValidationException(validationResult.Errors);
        }

        // Validera att avsändare existerar
        var senderExists = await _directMessageRepository.UserExistsAsync(request.SenderId);
        if (!senderExists)
        {
            throw new ArgumentException($"Avsändare med ID {request.SenderId} finns inte.", nameof(request.SenderId));
        }

        // Validera att mottagare existerar
        var recipientExists = await _directMessageRepository.UserExistsAsync(request.RecipientId);
        if (!recipientExists)
        {
            throw new ArgumentException($"Mottagare med ID {request.RecipientId} finns inte.", nameof(request.RecipientId));
        }

        // Validera att avsändare och mottagare inte är samma
        if (request.SenderId == request.RecipientId)
        {
            throw new ArgumentException("Du kan inte skicka meddelande till dig själv.", nameof(request.RecipientId));
        }

        // Skapa direct message
        var directMessage = new DirectMessage
        {
            Id = Guid.NewGuid(),
            SenderId = request.SenderId,
            RecipientId = request.RecipientId,
            Message = request.Message,
            CreatedAt = DateTime.UtcNow,
            IsRead = false
        };

        var createdMessage = await _directMessageRepository.CreateAsync(directMessage);

        return new DirectMessageResponse
        {
            Id = createdMessage.Id,
            SenderId = createdMessage.SenderId,
            RecipientId = createdMessage.RecipientId,
            Message = createdMessage.Message,
            CreatedAt = createdMessage.CreatedAt,
            IsRead = createdMessage.IsRead
        };
    }

    public async Task<List<DirectMessageResponse>> GetReceivedMessagesAsync(Guid userId)
    {
        // Validera att användaren existerar
        var userExists = await _directMessageRepository.UserExistsAsync(userId);
        if (!userExists)
        {
            throw new ArgumentException($"Användare med ID {userId} finns inte.", nameof(userId));
        }

        // Hämta mottagna meddelanden
        var messages = await _directMessageRepository.GetByRecipientIdAsync(userId);

        // Konvertera till DTOs
        return messages.Select(m => new DirectMessageResponse
        {
            Id = m.Id,
            SenderId = m.SenderId,
            RecipientId = m.RecipientId,
            Message = m.Message,
            CreatedAt = m.CreatedAt,
            IsRead = m.IsRead
        }).ToList();
    }

    public async Task MarkAsReadAsync(Guid messageId)
    {
        var message = await _directMessageRepository.GetByIdAsync(messageId);
        if (message == null)
        {
            throw new ArgumentException($"Meddelande med ID {messageId} finns inte.", nameof(messageId));
        }

        if (!message.IsRead)
        {
            message.IsRead = true;
            await _directMessageRepository.UpdateAsync(message);
        }
    }
}

