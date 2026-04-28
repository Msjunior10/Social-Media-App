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

    public async Task<List<PostResponse>> GetWallAsync(Guid userId)
    {
        // Validera att användaren existerar
        var userExists = await _postRepository.UserExistsAsync(userId);
        if (!userExists)
        {
            throw new ArgumentException($"Användare med ID {userId} finns inte.", nameof(userId));
        }

        // Hämta alla användare som användaren följer
        var follows = await _followRepository.GetFollowingAsync(userId);
        var followedUserIds = follows.Select(f => f.FollowingId).ToList();

        // Om användaren inte följer någon, returnera tom lista
        if (!followedUserIds.Any())
        {
            return new List<PostResponse>();
        }

        // Hämta alla posts från följda användare
        var posts = await _postRepository.GetPostsBySenderIdsAsync(followedUserIds);

        // Konvertera Post entities till PostResponse DTOs och sortera kronologiskt (senaste först)
        var postResponses = posts
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => new PostResponse
            {
                Id = p.Id,
                SenderId = p.SenderId,
                RecipientId = p.RecipientId,
                Message = p.Message,
                CreatedAt = p.CreatedAt
            })
            .ToList();

        return postResponses;
    }
}