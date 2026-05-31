using SocialTDD.Api.Extensions;
using SocialTDD.Application.Interfaces;
using System.Collections.Concurrent;

namespace SocialTDD.Api.Middleware;

public class UpdateLastActivityMiddleware
{
    private static readonly ConcurrentDictionary<Guid, DateTime> LastUpdateByUserId = new();
    private static readonly TimeSpan MinimumUpdateInterval = TimeSpan.FromMinutes(5);

    private readonly RequestDelegate _next;
    private readonly ILogger<UpdateLastActivityMiddleware> _logger;

    public UpdateLastActivityMiddleware(RequestDelegate next, ILogger<UpdateLastActivityMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context, IUserRepository userRepository)
    {
        if (context.User.Identity?.IsAuthenticated == true)
        {
            try
            {
                var userId = context.User.GetUserId();
                var now = DateTime.UtcNow;
                var previousUpdate = LastUpdateByUserId.GetOrAdd(userId, DateTime.MinValue);

                if (now - previousUpdate >= MinimumUpdateInterval && LastUpdateByUserId.TryUpdate(userId, now, previousUpdate))
                {
                    await userRepository.UpdateLastActiveAsync(userId, now);
                }
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "Kunde inte uppdatera senaste aktivitet för användaren.");
            }
        }

        await _next(context);
    }
}
