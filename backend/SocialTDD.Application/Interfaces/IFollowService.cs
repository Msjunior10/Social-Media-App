using SocialTDD.Application.DTOs;

namespace SocialTDD.Application.Interfaces;

public interface IFollowService
{
    Task<FollowResponse> FollowUserAsync(CreateFollowRequest request);
    Task UnfollowUserAsync(Guid followerId, Guid followingId);
    Task<List<FollowResponse>> GetFollowersAsync(Guid userId);
    Task<List<FollowResponse>> GetFollowingAsync(Guid userId);
}