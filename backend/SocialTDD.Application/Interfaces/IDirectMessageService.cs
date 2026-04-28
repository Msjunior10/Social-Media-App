using SocialTDD.Application.DTOs;

namespace SocialTDD.Application.Interfaces;

public interface IDirectMessageService
{
    Task<DirectMessageResponse> SendDirectMessageAsync(CreateDirectMessageRequest request);
    Task<List<DirectMessageResponse>> GetReceivedMessagesAsync(Guid userId);
    Task MarkAsReadAsync(Guid messageId);
}

