using FluentValidation;
using SocialTDD.Application.DTOs;
using SocialTDD.Application.Interfaces;
using SocialTDD.Domain.Entities;

namespace SocialTDD.Application.Services;

public class PostService : IPostService
{
    private readonly IPostRepository _postRepository;
    private readonly IValidator<CreatePostRequest> _createValidator;
    private readonly IValidator<UpdatePostRequest> _updateValidator;
    private readonly IValidator<CreatePostCommentRequest> _commentValidator;

    public PostService(
        IPostRepository postRepository,
        IValidator<CreatePostRequest> createValidator,
        IValidator<UpdatePostRequest> updateValidator,
        IValidator<CreatePostCommentRequest> commentValidator)
    {
        _postRepository = postRepository;
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

        return new PostCommentResponse
        {
            Id = createdComment.Id,
            PostId = createdComment.PostId,
            UserId = createdComment.UserId,
            Message = createdComment.Message,
            CreatedAt = createdComment.CreatedAt
        };
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
            CreatedAt = p.CreatedAt
        }).ToList();
    }

    private async Task<PostResponse> MapToPostResponseAsync(Post post, Guid currentUserId)
    {
        var comments = await _postRepository.GetCommentsByPostIdAsync(post.Id);

        return new PostResponse
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
        };
    }
}




