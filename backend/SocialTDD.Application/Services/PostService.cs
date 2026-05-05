using FluentValidation;
using SocialTDD.Application.DTOs;
using SocialTDD.Application.Interfaces;
using SocialTDD.Domain.Entities;

namespace SocialTDD.Application.Services;

public class PostService : IPostService
{
    private readonly IPostRepository _postRepository;
    private readonly INotificationService _notificationService;
    private readonly IValidator<CreatePostRequest> _createValidator;
    private readonly IValidator<UpdatePostRequest> _updateValidator;
    private readonly IValidator<CreatePostCommentRequest> _commentValidator;

    public PostService(
        IPostRepository postRepository,
        IValidator<CreatePostRequest> createValidator,
        IValidator<UpdatePostRequest> updateValidator,
        IValidator<CreatePostCommentRequest> commentValidator,
        INotificationService? notificationService = null)
    {
        _postRepository = postRepository;
        _notificationService = notificationService ?? new NullNotificationService();
        _createValidator = createValidator;
        _updateValidator = updateValidator;
        _commentValidator = commentValidator;
    }

    public async Task<PostResponse> CreatePostAsync(CreatePostRequest request)
    {
        // Validera input
        var validationResult = await _createValidator.ValidateAsync(request);
        if (!validationResult.IsValid)
        {
            throw new ValidationException(validationResult.Errors);
        }

        // Validera att avsändare existerar
        var senderExists = await _postRepository.UserExistsAsync(request.SenderId);
        if (!senderExists)
        {
            throw new ArgumentException($"Avsändare med ID {request.SenderId} finns inte.", nameof(request.SenderId));
        }

        // Skapa offentligt inlägg på användarens egen tidslinje
        var post = new Post
        {
            Id = Guid.NewGuid(),
            SenderId = request.SenderId,
            RecipientId = request.SenderId,
            Message = request.Message,
            ImageUrl = string.IsNullOrWhiteSpace(request.ImageUrl) ? null : request.ImageUrl.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        var createdPost = await _postRepository.CreateAsync(post);

        return await MapToPostResponseAsync(createdPost, request.SenderId);
    }

    public async Task<PostResponse> UpdatePostAsync(Guid postId, Guid userId, UpdatePostRequest request)
    {
        var validationResult = await _updateValidator.ValidateAsync(request);
        if (!validationResult.IsValid)
        {
            throw new ValidationException(validationResult.Errors);
        }

        var post = await _postRepository.GetByIdAsync(postId);
        if (post == null)
        {
            throw new KeyNotFoundException($"Inlägg med ID {postId} finns inte.");
        }

        if (post.SenderId != userId)
        {
            throw new UnauthorizedAccessException("Du kan bara redigera dina egna inlägg.");
        }

        post.Message = request.Message.Trim();

        var updatedPost = await _postRepository.UpdateAsync(post);

        return await MapToPostResponseAsync(updatedPost, userId);
    }

    public async Task DeletePostAsync(Guid postId, Guid userId)
    {
        var post = await _postRepository.GetByIdAsync(postId);
        if (post == null)
        {
            throw new KeyNotFoundException($"Inlägg med ID {postId} finns inte.");
        }

        if (post.SenderId != userId)
        {
            throw new UnauthorizedAccessException("Du kan bara ta bort dina egna inlägg.");
        }

        await _postRepository.DeleteAsync(postId);
    }

    public async Task<PostResponse> LikePostAsync(Guid postId, Guid userId)
    {
        var post = await _postRepository.GetByIdAsync(postId);
        if (post == null)
        {
            throw new KeyNotFoundException($"Inlägg med ID {postId} finns inte.");
        }

        var userExists = await _postRepository.UserExistsAsync(userId);
        if (!userExists)
        {
            throw new ArgumentException($"Användare med ID {userId} finns inte.", nameof(userId));
        }

        var isLiked = await _postRepository.IsLikedByUserAsync(postId, userId);
        if (!isLiked)
        {
            await _postRepository.AddLikeAsync(new PostLike
            {
                Id = Guid.NewGuid(),
                PostId = postId,
                UserId = userId,
                CreatedAt = DateTime.UtcNow
            });

            await _notificationService.CreatePostLikeNotificationAsync(post.SenderId, userId, postId);
        }

        return await MapToPostResponseAsync(post, userId);
    }

    public async Task<PostResponse> UnlikePostAsync(Guid postId, Guid userId)
    {
        var post = await _postRepository.GetByIdAsync(postId);
        if (post == null)
        {
            throw new KeyNotFoundException($"Inlägg med ID {postId} finns inte.");
        }

        await _postRepository.RemoveLikeAsync(postId, userId);
        return await MapToPostResponseAsync(post, userId);
    }

    public async Task<PostResponse> RepostAsync(Guid postId, Guid userId)
    {
        var post = await _postRepository.GetByIdAsync(postId);
        if (post == null)
        {
            throw new KeyNotFoundException($"Inlägg med ID {postId} finns inte.");
        }

        var userExists = await _postRepository.UserExistsAsync(userId);
        if (!userExists)
        {
            throw new ArgumentException($"Användare med ID {userId} finns inte.", nameof(userId));
        }

        var isPureRepost = post.OriginalPostId.HasValue && string.IsNullOrWhiteSpace(post.Message);
        var targetPost = isPureRepost ? (post.OriginalPost ?? post) : post;
        if (targetPost.SenderId == userId)
        {
            throw new ArgumentException("Du kan inte återpublicera ditt eget inlägg.", nameof(userId));
        }

        var existingRepost = await _postRepository.GetRepostByUserAsync(targetPost.Id, userId);
        if (existingRepost == null)
        {
            await _postRepository.CreateAsync(new Post
            {
                Id = Guid.NewGuid(),
                SenderId = userId,
                RecipientId = userId,
                OriginalPostId = targetPost.Id,
                Message = string.Empty,
                ImageUrl = null,
                CreatedAt = DateTime.UtcNow
            });

            await _notificationService.CreatePostRepostNotificationAsync(targetPost.SenderId, userId, targetPost.Id);
        }

        return await MapToPostResponseAsync(targetPost, userId);
    }

    public async Task<PostResponse> RemoveRepostAsync(Guid postId, Guid userId)
    {
        var post = await _postRepository.GetByIdAsync(postId);
        if (post == null)
        {
            throw new KeyNotFoundException($"Inlägg med ID {postId} finns inte.");
        }

        var isPureRepost = post.OriginalPostId.HasValue && string.IsNullOrWhiteSpace(post.Message);
        var targetPost = isPureRepost ? (post.OriginalPost ?? post) : post;
        var repost = await _postRepository.GetRepostByUserAsync(targetPost.Id, userId);
        if (repost != null)
        {
            await _postRepository.DeleteAsync(repost.Id);
        }

        return await MapToPostResponseAsync(targetPost, userId);
    }

    public async Task<PostResponse> BookmarkPostAsync(Guid postId, Guid userId)
    {
        var post = await _postRepository.GetByIdAsync(postId);
        if (post == null)
        {
            throw new KeyNotFoundException($"Inlägg med ID {postId} finns inte.");
        }

        var userExists = await _postRepository.UserExistsAsync(userId);
        if (!userExists)
        {
            throw new ArgumentException($"Användare med ID {userId} finns inte.", nameof(userId));
        }

        var isBookmarked = await _postRepository.IsBookmarkedByUserAsync(postId, userId);
        if (!isBookmarked)
        {
            await _postRepository.AddBookmarkAsync(new PostBookmark
            {
                Id = Guid.NewGuid(),
                PostId = postId,
                UserId = userId,
                CreatedAt = DateTime.UtcNow
            });
        }

        return await MapToPostResponseAsync(post, userId);
    }

    public async Task<PostResponse> RemoveBookmarkAsync(Guid postId, Guid userId)
    {
        var post = await _postRepository.GetByIdAsync(postId);
        if (post == null)
        {
            throw new KeyNotFoundException($"Inlägg med ID {postId} finns inte.");
        }

        await _postRepository.RemoveBookmarkAsync(postId, userId);
        return await MapToPostResponseAsync(post, userId);
    }

    public async Task<PostCommentResponse> AddCommentAsync(Guid postId, Guid userId, CreatePostCommentRequest request)
    {
        var validationResult = await _commentValidator.ValidateAsync(request);
        if (!validationResult.IsValid)
        {
            throw new ValidationException(validationResult.Errors);
        }

        var post = await _postRepository.GetByIdAsync(postId);
        if (post == null)
        {
            throw new KeyNotFoundException($"Inlägg med ID {postId} finns inte.");
        }

        var userExists = await _postRepository.UserExistsAsync(userId);
        if (!userExists)
        {
            throw new ArgumentException($"Användare med ID {userId} finns inte.", nameof(userId));
        }

        var createdComment = await _postRepository.AddCommentAsync(new PostComment
        {
            Id = Guid.NewGuid(),
            PostId = postId,
            UserId = userId,
            Message = request.Message.Trim(),
            CreatedAt = DateTime.UtcNow
        });

        await _notificationService.CreatePostCommentNotificationAsync(post.SenderId, userId, postId);

        return new PostCommentResponse
        {
            Id = createdComment.Id,
            PostId = createdComment.PostId,
            UserId = createdComment.UserId,
            Message = createdComment.Message,
            CreatedAt = createdComment.CreatedAt
        };
    }

    public async Task<PostCommentResponse> UpdateCommentAsync(Guid postId, Guid commentId, Guid userId, CreatePostCommentRequest request)
    {
        var validationResult = await _commentValidator.ValidateAsync(request);
        if (!validationResult.IsValid)
        {
            throw new ValidationException(validationResult.Errors);
        }

        var post = await _postRepository.GetByIdAsync(postId);
        if (post == null)
        {
            throw new KeyNotFoundException($"Inlägg med ID {postId} finns inte.");
        }

        var comment = await _postRepository.GetCommentByIdAsync(commentId);
        if (comment == null || comment.PostId != postId)
        {
            throw new KeyNotFoundException($"Kommentar med ID {commentId} finns inte.");
        }

        if (comment.UserId != userId)
        {
            throw new UnauthorizedAccessException("Du kan bara ändra dina egna kommentarer.");
        }

        comment.Message = request.Message.Trim();
        var updatedComment = await _postRepository.UpdateCommentAsync(comment);

        return new PostCommentResponse
        {
            Id = updatedComment.Id,
            PostId = updatedComment.PostId,
            UserId = updatedComment.UserId,
            Message = updatedComment.Message,
            CreatedAt = updatedComment.CreatedAt
        };
    }

    public async Task DeleteCommentAsync(Guid postId, Guid commentId, Guid userId)
    {
        var post = await _postRepository.GetByIdAsync(postId);
        if (post == null)
        {
            throw new KeyNotFoundException($"Inlägg med ID {postId} finns inte.");
        }

        var comment = await _postRepository.GetCommentByIdAsync(commentId);
        if (comment == null || comment.PostId != postId)
        {
            throw new KeyNotFoundException($"Kommentar med ID {commentId} finns inte.");
        }

        if (comment.UserId != userId)
        {
            throw new UnauthorizedAccessException("Du kan bara ta bort dina egna kommentarer.");
        }

        await _postRepository.DeleteCommentAsync(commentId);
    }

    public async Task<List<PostResponse>> GetConversationAsync(Guid userId1, Guid userId2)
    {
        // Validera att båda användare existerar
        var user1Exists = await _postRepository.UserExistsAsync(userId1);
        if (!user1Exists)
        {
            throw new ArgumentException($"Användare med ID {userId1} finns inte.", nameof(userId1));
        }

        var user2Exists = await _postRepository.UserExistsAsync(userId2);
        if (!user2Exists)
        {
            throw new ArgumentException($"Användare med ID {userId2} finns inte.", nameof(userId2));
        }

        // Validera att användarna inte är samma
        if (userId1 == userId2)
        {
            throw new ArgumentException("Användare kan inte ha en konversation med sig själv.");
        }

        // Hämta konversationen
        var posts = await _postRepository.GetConversationAsync(userId1, userId2);

        // Konvertera till DTOs
        return posts.Select(p => new PostResponse
        {
            Id = p.Id,
            SenderId = p.SenderId,
            RecipientId = p.RecipientId,
            Message = p.Message,
            ImageUrl = p.ImageUrl,
            CreatedAt = p.CreatedAt,
            TargetPostId = p.OriginalPostId.HasValue && string.IsNullOrWhiteSpace(p.Message)
                ? p.OriginalPostId.Value
                : p.Id,
            IsRepost = p.OriginalPostId.HasValue && string.IsNullOrWhiteSpace(p.Message),
            IsBookmarkedByCurrentUser = false
        }).ToList();
    }

    public async Task<List<PostResponse>> GetSavedPostsAsync(Guid userId)
    {
        var userExists = await _postRepository.UserExistsAsync(userId);
        if (!userExists)
        {
            throw new ArgumentException($"Användare med ID {userId} finns inte.", nameof(userId));
        }

        var posts = await _postRepository.GetBookmarkedPostsAsync(userId);
        var postResponses = new List<PostResponse>();

        foreach (var post in posts)
        {
            postResponses.Add(await MapToPostResponseAsync(post, userId));
        }

        return postResponses;
    }

    private async Task<PostResponse> MapToPostResponseAsync(Post post, Guid currentUserId)
    {
        var isPureRepost = post.OriginalPostId.HasValue && string.IsNullOrWhiteSpace(post.Message);
        var targetPost = isPureRepost ? (post.OriginalPost ?? post) : post;
        var comments = await _postRepository.GetCommentsByPostIdAsync(targetPost.Id);

        return new PostResponse
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
        };
    }
}




