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

    public PostService(
        IPostRepository postRepository,
        IValidator<CreatePostRequest> createValidator,
        IValidator<UpdatePostRequest> updateValidator)
    {
        _postRepository = postRepository;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
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
            CreatedAt = DateTime.UtcNow
        };

        var createdPost = await _postRepository.CreateAsync(post);

        return new PostResponse
        {
            Id = createdPost.Id,
            SenderId = createdPost.SenderId,
            RecipientId = createdPost.RecipientId,
            Message = createdPost.Message,
            CreatedAt = createdPost.CreatedAt
        };
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

        return new PostResponse
        {
            Id = updatedPost.Id,
            SenderId = updatedPost.SenderId,
            RecipientId = updatedPost.RecipientId,
            Message = updatedPost.Message,
            CreatedAt = updatedPost.CreatedAt
        };
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
            CreatedAt = p.CreatedAt
        }).ToList();
    }
}




