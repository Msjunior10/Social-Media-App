using SocialTDD.Application.DTOs;

namespace SocialTDD.Application.Interfaces;

public interface IPostService
{
    Task<PostResponse> CreatePostAsync(CreatePostRequest request);
    Task<PostResponse> GetPostByIdAsync(Guid postId, Guid currentUserId);
    Task<PostResponse> UpdatePostAsync(Guid postId, Guid userId, UpdatePostRequest request);
    Task DeletePostAsync(Guid postId, Guid userId);
    Task<PostResponse> LikePostAsync(Guid postId, Guid userId);
    Task<PostResponse> UnlikePostAsync(Guid postId, Guid userId);
    Task<PostResponse> RepostAsync(Guid postId, Guid userId);
    Task<PostResponse> RemoveRepostAsync(Guid postId, Guid userId);
    Task<PostResponse> BookmarkPostAsync(Guid postId, Guid userId);
    Task<PostResponse> RemoveBookmarkAsync(Guid postId, Guid userId);
    Task<PostCommentResponse> AddCommentAsync(Guid postId, Guid userId, CreatePostCommentRequest request);
    Task<PostCommentResponse> UpdateCommentAsync(Guid postId, Guid commentId, Guid userId, CreatePostCommentRequest request);
    Task DeleteCommentAsync(Guid postId, Guid commentId, Guid userId);
    Task<List<PostResponse>> GetSavedPostsAsync(Guid userId);
    Task<List<PostResponse>> GetConversationAsync(Guid userId1, Guid userId2);
}



