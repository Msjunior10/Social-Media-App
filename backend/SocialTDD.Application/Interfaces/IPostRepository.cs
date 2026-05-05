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
    Task<IEnumerable<Post>> GetBookmarkedPostsAsync(Guid userId);
    Task<int> GetLikeCountAsync(Guid postId);
    Task<int> GetRepostCountAsync(Guid postId);
    Task<bool> IsLikedByUserAsync(Guid postId, Guid userId);
    Task<bool> IsBookmarkedByUserAsync(Guid postId, Guid userId);
    Task<bool> IsRepostedByUserAsync(Guid postId, Guid userId);
    Task<Post?> GetRepostByUserAsync(Guid postId, Guid userId);
    Task AddLikeAsync(PostLike like);
    Task RemoveLikeAsync(Guid postId, Guid userId);
    Task AddBookmarkAsync(PostBookmark bookmark);
    Task RemoveBookmarkAsync(Guid postId, Guid userId);
    Task<IEnumerable<PostComment>> GetCommentsByPostIdAsync(Guid postId);
    Task<PostComment?> GetCommentByIdAsync(Guid commentId);
    Task<PostComment> AddCommentAsync(PostComment comment);
    Task<PostComment> UpdateCommentAsync(PostComment comment);
    Task<bool> DeleteCommentAsync(Guid commentId);
    Task<bool> UserExistsAsync(Guid userId);
}

