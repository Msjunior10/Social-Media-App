using SocialTDD.Application.DTOs;

namespace SocialTDD.Application.Interfaces;

public interface IPostService
{
    Task<PostResponse> CreatePostAsync(CreatePostRequest request);
    Task<PostResponse> UpdatePostAsync(Guid postId, Guid userId, UpdatePostRequest request);
    Task DeletePostAsync(Guid postId, Guid userId);
    Task<PostResponse> LikePostAsync(Guid postId, Guid userId);
    Task<PostResponse> UnlikePostAsync(Guid postId, Guid userId);
    Task<PostCommentResponse> AddCommentAsync(Guid postId, Guid userId, CreatePostCommentRequest request);
    Task<List<PostResponse>> GetConversationAsync(Guid userId1, Guid userId2);
}



