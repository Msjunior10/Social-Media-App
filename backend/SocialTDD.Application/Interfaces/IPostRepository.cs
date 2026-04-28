using SocialTDD.Domain.Entities;

namespace SocialTDD.Application.Interfaces;

public interface IPostRepository
{
    Task<Post> CreateAsync(Post post);
    Task<Post?> GetByIdAsync(Guid id);
    Task<IEnumerable<Post>> GetByRecipientIdAsync(Guid recipientId);
    Task<IEnumerable<Post>> GetTimelinePostsAsync(Guid userId); // NY METOD
    Task<IEnumerable<Post>> GetConversationAsync(Guid userId1, Guid userId2);
    Task<IEnumerable<Post>> GetPostsBySenderIdsAsync(IEnumerable<Guid> senderIds);
    Task<bool> UserExistsAsync(Guid userId);
}

