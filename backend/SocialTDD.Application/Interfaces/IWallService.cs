using SocialTDD.Application.DTOs;

namespace SocialTDD.Application.Interfaces;

public interface IWallService
{
    Task<List<PostResponse>> GetWallAsync(Guid userId);
}