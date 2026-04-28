using SocialTDD.Domain.Entities;

namespace SocialTDD.Application.Interfaces;

public interface IDirectMessageRepository
{
    Task<DirectMessage> CreateAsync(DirectMessage directMessage);
    Task<IEnumerable<DirectMessage>> GetByRecipientIdAsync(Guid recipientId);
    Task<IEnumerable<DirectMessage>> GetBySenderIdAsync(Guid senderId);
    Task<DirectMessage?> GetByIdAsync(Guid id);
    Task<bool> UserExistsAsync(Guid userId);
    Task UpdateAsync(DirectMessage directMessage);
}

