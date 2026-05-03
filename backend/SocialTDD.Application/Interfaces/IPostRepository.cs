using SocialTDD.Domain.Entities;

namespace SocialTDD.Application.Interfaces;

public interface IPostRepository
{
    Task<Post> CreateAsync(Post post);
    Task<Post> UpdateAsync(Post post);
    Task<bool> DeleteAsync(Guid id);
    Task<IEnumerable<Post>> GetAllPostsAsync();
    Task<Post?> GetByIdAsync(Guid id);
    Task<IEnumerable<Post>> GetByRecipientIdAsync(Guid recipientId);
    Task<IEnumerable<Post>> GetTimelinePostsAsync(Guid userId); // NY METOD
    Task<IEnumerable<Post>> GetConversationAsync(Guid userId1, Guid userId2);
    Task<IEnumerable<Post>> GetPostsBySenderIdsAsync(IEnumerable<Guid> senderIds);
    Task<int> GetLikeCountAsync(Guid postId);
    Task<bool> IsLikedByUserAsync(Guid postId, Guid userId);
    Task AddLikeAsync(PostLike like);
    Task RemoveLikeAsync(Guid postId, Guid userId);
    Task<IEnumerable<PostComment>> GetCommentsByPostIdAsync(Guid postId);
    Task<PostComment> AddCommentAsync(PostComment comment);
    Task<bool> UserExistsAsync(Guid userId);
}

