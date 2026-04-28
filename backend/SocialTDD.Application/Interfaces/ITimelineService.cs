using SocialTDD.Application.DTOs;

namespace SocialTDD.Application.Interfaces;

public interface ITimelineService
{
    Task<List<PostResponse>> GetTimelineAsync(Guid userId);
}

