using SocialTDD.Application.DTOs;
using SocialTDD.Application.Interfaces;

namespace SocialTDD.Application.Services;

public class WallService : IWallService
{
    private readonly IFollowRepository _followRepository;
    private readonly IPostRepository _postRepository;

    public WallService(IFollowRepository followRepository, IPostRepository postRepository)
    {
        _followRepository = followRepository ?? throw new ArgumentNullException(nameof(followRepository));
        _postRepository = postRepository ?? throw new ArgumentNullException(nameof(postRepository));
    }

    public async Task<List<PostResponse>> GetWallAsync(Guid userId, Guid currentUserId)
    {
        // Validera att användaren existerar
        var userExists = await _postRepository.UserExistsAsync(userId);
        if (!userExists)
        {
            throw new ArgumentException($"Användare med ID {userId} finns inte.", nameof(userId));
        }

        // Hämta alla offentliga inlägg i appen
        var posts = await _postRepository.GetAllPostsAsync();

        // Konvertera Post entities till PostResponse DTOs och sortera kronologiskt (senaste först)
        var postResponses = new List<PostResponse>();

        foreach (var post in posts.OrderByDescending(p => p.CreatedAt))
        {
            var comments = await _postRepository.GetCommentsByPostIdAsync(post.Id);
            postResponses.Add(new PostResponse
            {
                Id = post.Id,
                SenderId = post.SenderId,
                RecipientId = post.RecipientId,
                Message = post.Message,
                ImageUrl = post.ImageUrl,
                CreatedAt = post.CreatedAt,
                LikeCount = await _postRepository.GetLikeCountAsync(post.Id),
                IsLikedByCurrentUser = await _postRepository.IsLikedByUserAsync(post.Id, currentUserId),
                Comments = comments.Select(c => new PostCommentResponse
                {
                    Id = c.Id,
                    PostId = c.PostId,
                    UserId = c.UserId,
                    Message = c.Message,
                    CreatedAt = c.CreatedAt
                }).ToList()
            });
        }

        return postResponses;
    }
}