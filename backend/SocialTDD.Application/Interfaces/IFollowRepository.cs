using SocialTDD.Domain.Entities;

namespace SocialTDD.Application.Interfaces;

public interface IFollowRepository
{
    Task<Follow> CreateAsync(Follow follow);
    Task<bool> FollowExistsAsync(Guid followerId, Guid followingId);
    Task<Follow?> GetFollowAsync(Guid followerId, Guid followingId);
    Task<bool> DeleteAsync(Guid followerId, Guid followingId);
    Task<IEnumerable<Follow>> GetFollowersAsync(Guid userId);
    Task<IEnumerable<Follow>> GetFollowingAsync(Guid userId);
    Task<bool> UserExistsAsync(Guid userId);
    Task<bool> IsCircularFollowAsync(Guid followerId, Guid followingId);
}