using FluentValidation;
using SocialTDD.Application.DTOs;
using SocialTDD.Application.Interfaces;
using SocialTDD.Domain.Entities;

namespace SocialTDD.Application.Services;

public class PostService : IPostService
{
    private readonly IPostRepository _postRepository;
    private readonly IValidator<CreatePostRequest> _validator;

    public PostService(IPostRepository postRepository, IValidator<CreatePostRequest> validator)
    {
        _postRepository = postRepository;
        _validator = validator;
    }

    public async Task<PostResponse> CreatePostAsync(CreatePostRequest request)
    {
        // Validera input
        var validationResult = await _validator.ValidateAsync(request);
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

        // Validera att mottagare existerar
        var recipientExists = await _postRepository.UserExistsAsync(request.RecipientId);
        if (!recipientExists)
        {
            throw new ArgumentException($"Mottagare med ID {request.RecipientId} finns inte.", nameof(request.RecipientId));
        }

        // Validera att avsändare och mottagare inte är samma
        if (request.SenderId == request.RecipientId)
        {
            throw new ArgumentException("Avsändare och mottagare kan inte vara samma användare.", nameof(request.RecipientId));
        }

        // Skapa post
        var post = new Post
        {
            Id = Guid.NewGuid(),
            SenderId = request.SenderId,
            RecipientId = request.RecipientId,
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




