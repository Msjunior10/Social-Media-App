using FluentValidation;
using SocialTDD.Application.DTOs;
using SocialTDD.Application.Interfaces;
using SocialTDD.Domain.Entities;

namespace SocialTDD.Application.Services;

public class FollowService : IFollowService
{
    private readonly IFollowRepository _followRepository;
    private readonly IValidator<CreateFollowRequest> _validator;

    public FollowService(IFollowRepository followRepository, IValidator<CreateFollowRequest> validator)
    {
        _followRepository = followRepository ?? throw new ArgumentNullException(nameof(followRepository));
        _validator = validator ?? throw new ArgumentNullException(nameof(validator));
    }

    public async Task<FollowResponse> FollowUserAsync(CreateFollowRequest request)
    {
        // Validera input
        var validationResult = await _validator.ValidateAsync(request);
        if (!validationResult.IsValid)
        {
            throw new ValidationException(validationResult.Errors);
        }

        // Validera att följare existerar
        var followerExists = await _followRepository.UserExistsAsync(request.FollowerId);
        if (!followerExists)
        {
            throw new ArgumentException($"Användare med ID {request.FollowerId} finns inte.", nameof(request.FollowerId));
        }

        // Validera att den som ska följas existerar
        var followingExists = await _followRepository.UserExistsAsync(request.FollowingId);
        if (!followingExists)
        {
            throw new ArgumentException($"Användare med ID {request.FollowingId} finns inte.", nameof(request.FollowingId));
        }

        // Validera att följare och följd inte är samma
        if (request.FollowerId == request.FollowingId)
        {
            throw new ArgumentException("Användare kan inte följa sig själv.", nameof(request.FollowingId));
        }

        // Kontrollera om relationen redan existerar
        var alreadyFollowing = await _followRepository.FollowExistsAsync(request.FollowerId, request.FollowingId);
        if (alreadyFollowing)
        {
            throw new InvalidOperationException($"Användare {request.FollowerId} följer redan användare {request.FollowingId}.");
        }

        // Ömsesidiga följ-relationer (A följer B och B följer A) är tillåtna
        // Vi blockerar bara om användaren redan följer den andra (vilket kontrolleras ovan)

        // Skapa follow-relation
        var follow = new Follow
        {
            Id = Guid.NewGuid(),
            FollowerId = request.FollowerId,
            FollowingId = request.FollowingId,
            CreatedAt = DateTime.UtcNow
        };

        var createdFollow = await _followRepository.CreateAsync(follow);

        return new FollowResponse
        {
            Id = createdFollow.Id,
            FollowerId = createdFollow.FollowerId,
            FollowingId = createdFollow.FollowingId,
            CreatedAt = createdFollow.CreatedAt
        };
    }

    public async Task UnfollowUserAsync(Guid followerId, Guid followingId)
    {
        // Kontrollera om relationen existerar
        var followExists = await _followRepository.FollowExistsAsync(followerId, followingId);
        if (!followExists)
        {
            throw new InvalidOperationException($"Användare {followerId} följer inte användare {followingId}.");
        }

        // Ta bort follow-relation
        await _followRepository.DeleteAsync(followerId, followingId);
    }

    public async Task<List<FollowResponse>> GetFollowersAsync(Guid userId)
    {
        // Validera att användaren existerar
        var userExists = await _followRepository.UserExistsAsync(userId);
        if (!userExists)
        {
            throw new ArgumentException($"Användare med ID {userId} finns inte.", nameof(userId));
        }

        var follows = await _followRepository.GetFollowersAsync(userId);

        return follows
            .Select(f => new FollowResponse
            {
                Id = f.Id,
                FollowerId = f.FollowerId,
                FollowingId = f.FollowingId,
                CreatedAt = f.CreatedAt
            })
            .ToList();
    }

    public async Task<List<FollowResponse>> GetFollowingAsync(Guid userId)
    {
        // Validera att användaren existerar
        var userExists = await _followRepository.UserExistsAsync(userId);
        if (!userExists)
        {
            throw new ArgumentException($"Användare med ID {userId} finns inte.", nameof(userId));
        }

        var follows = await _followRepository.GetFollowingAsync(userId);

        return follows
            .Select(f => new FollowResponse
            {
                Id = f.Id,
                FollowerId = f.FollowerId,
                FollowingId = f.FollowingId,
                CreatedAt = f.CreatedAt
            })
            .ToList();
    }
}