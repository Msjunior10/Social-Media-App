using SocialTDD.Application.DTOs;
using SocialTDD.Application.Interfaces;
using SocialTDD.Domain.Entities;

namespace SocialTDD.Application.Services;

public class WallService : IWallService
{
    private readonly IFollowRepository _followRepository;
    private readonly IPostRepository _postRepository;
    private const int DefaultPageSize = 10;
    private const int MaxPageSize = 25;

    public WallService(IFollowRepository followRepository, IPostRepository postRepository)
    {
        _followRepository = followRepository ?? throw new ArgumentNullException(nameof(followRepository));
        _postRepository = postRepository ?? throw new ArgumentNullException(nameof(postRepository));
    }

    public async Task<List<PostResponse>> GetWallAsync(Guid userId, Guid currentUserId)
    {
        var page = await GetWallPageAsync(userId, currentUserId, 1, int.MaxValue);
        return page.Items;
    }

    public async Task<PagedResponse<PostResponse>> GetWallPageAsync(Guid userId, Guid currentUserId, int page, int pageSize)
    {
        // Validera att användaren existerar
        var userExists = await _postRepository.UserExistsAsync(userId);
        if (!userExists)
        {
            throw new ArgumentException($"Användare med ID {userId} finns inte.", nameof(userId));
        }

        var normalizedPage = Math.Max(page, 1);
        var normalizedPageSize = NormalizePageSize(pageSize);

        var posts = await _postRepository.GetAllPostsPageAsync(normalizedPage, normalizedPageSize);
        var totalCount = await _postRepository.CountAllPostsAsync();

        return new PagedResponse<PostResponse>
        {
            Items = await MapPostsAsync(posts, currentUserId),
            Page = normalizedPage,
            PageSize = normalizedPageSize,
            TotalCount = totalCount
        };
    }

    private async Task<List<PostResponse>> MapPostsAsync(IEnumerable<SocialTDD.Domain.Entities.Post> posts, Guid currentUserId)
    {
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

    private static int NormalizePageSize(int pageSize)
    {
        if (pageSize == int.MaxValue)
        {
            return int.MaxValue;
        }

        if (pageSize <= 0)
        {
            return DefaultPageSize;
        }

        return Math.Min(pageSize, MaxPageSize);
    }
}