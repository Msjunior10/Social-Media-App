using SocialTDD.Application.DTOs;

namespace SocialTDD.Application.Interfaces;

public interface ITimelineService
{
    Task<List<PostResponse>> GetTimelineAsync(Guid userId, Guid currentUserId);
    Task<PagedResponse<PostResponse>> GetTimelinePageAsync(Guid userId, Guid currentUserId, int page, int pageSize);
}

