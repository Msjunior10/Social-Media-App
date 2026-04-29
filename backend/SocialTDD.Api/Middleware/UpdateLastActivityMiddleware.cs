using SocialTDD.Api.Extensions;
using SocialTDD.Application.Interfaces;

namespace SocialTDD.Api.Middleware;

public class UpdateLastActivityMiddleware
{
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
                await userRepository.UpdateLastActiveAsync(userId, DateTime.UtcNow);
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "Kunde inte uppdatera senaste aktivitet för användaren.");
            }
        }

        await _next(context);
    }
}
