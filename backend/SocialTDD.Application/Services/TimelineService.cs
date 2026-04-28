using SocialTDD.Application.DTOs;
using SocialTDD.Application.Interfaces;

namespace SocialTDD.Application.Services;

public class TimelineService : ITimelineService
{
    private readonly IPostRepository _postRepository;

    public TimelineService(IPostRepository postRepository)
    {
        _postRepository = postRepository ?? throw new ArgumentNullException(nameof(postRepository));
    }

    public async Task<List<PostResponse>> GetTimelineAsync(Guid userId)
    {
        // Validera att användaren existerar
        var userExists = await _postRepository.UserExistsAsync(userId);
        if (!userExists)
        {
            throw new ArgumentException($"Användare med ID {userId} finns inte.", nameof(userId));
        }

        // Hämta alla posts för användarens tidslinje
        var posts = await _postRepository.GetTimelinePostsAsync(userId);

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

