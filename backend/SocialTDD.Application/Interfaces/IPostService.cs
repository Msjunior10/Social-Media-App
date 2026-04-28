using SocialTDD.Application.DTOs;

namespace SocialTDD.Application.Interfaces;

public interface IPostService
{
    Task<PostResponse> CreatePostAsync(CreatePostRequest request);
    Task<List<PostResponse>> GetConversationAsync(Guid userId1, Guid userId2);
}



