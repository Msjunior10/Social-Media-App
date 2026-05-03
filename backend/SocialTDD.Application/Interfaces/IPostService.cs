using SocialTDD.Application.DTOs;

namespace SocialTDD.Application.Interfaces;

public interface IPostService
{
    Task<PostResponse> CreatePostAsync(CreatePostRequest request);
    Task<PostResponse> UpdatePostAsync(Guid postId, Guid userId, UpdatePostRequest request);
    Task DeletePostAsync(Guid postId, Guid userId);
    Task<List<PostResponse>> GetConversationAsync(Guid userId1, Guid userId2);
}



