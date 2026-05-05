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
            var isPureRepost = post.OriginalPostId.HasValue && string.IsNullOrWhiteSpace(post.Message);
            var targetPost = isPureRepost ? (post.OriginalPost ?? post) : post;
            var comments = await _postRepository.GetCommentsByPostIdAsync(targetPost.Id);
            postResponses.Add(new PostResponse
            {
                Id = post.Id,
                SenderId = post.SenderId,
                RecipientId = post.RecipientId,
                Message = post.Message,
                ImageUrl = post.ImageUrl,
                CreatedAt = post.CreatedAt,
                TargetPostId = targetPost.Id,
                LikeCount = await _postRepository.GetLikeCountAsync(targetPost.Id),
                RepostCount = await _postRepository.GetRepostCountAsync(targetPost.Id),
                IsLikedByCurrentUser = await _postRepository.IsLikedByUserAsync(targetPost.Id, currentUserId),
                IsBookmarkedByCurrentUser = await _postRepository.IsBookmarkedByUserAsync(targetPost.Id, currentUserId),
                IsRepostedByCurrentUser = await _postRepository.IsRepostedByUserAsync(targetPost.Id, currentUserId),
                IsRepost = isPureRepost,
                OriginalPostId = post.OriginalPostId,
                OriginalSenderId = post.OriginalPost?.SenderId,
                OriginalMessage = post.OriginalPost?.Message,
                OriginalImageUrl = post.OriginalPost?.ImageUrl,
                OriginalCreatedAt = post.OriginalPost?.CreatedAt,
                Comments = comments.Select(c => new PostCommentResponse
                {
                    Id = c.Id,
                    PostId = targetPost.Id,
                    UserId = c.UserId,
                    Message = c.Message,
                    CreatedAt = c.CreatedAt
                }).ToList()
            });
        }

        return postResponses;
    }
}