using SocialTDD.Application.DTOs;

namespace SocialTDD.Application.Interfaces;

public interface IWallService
{
    Task<List<PostResponse>> GetWallAsync(Guid userId, Guid currentUserId);
    Task<PagedResponse<PostResponse>> GetWallPageAsync(Guid userId, Guid currentUserId, int page, int pageSize);
}