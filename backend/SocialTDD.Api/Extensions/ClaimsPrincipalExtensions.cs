using System.Security.Claims;

namespace SocialTDD.Api.Extensions;

public static class ClaimsPrincipalExtensions
{
    /// <summary>
    /// Hämtar användar-ID från JWT token claims
    /// </summary>
    /// <param name="principal">ClaimsPrincipal från HttpContext.User</param>
    /// <returns>Användar-ID som Guid</returns>
    /// <exception cref="UnauthorizedAccessException">Om användar-ID inte finns i claims</exception>
    public static Guid GetUserId(this ClaimsPrincipal principal)
    {
        var userIdClaim = principal?.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? throw new UnauthorizedAccessException("Användar-ID saknas i token.");

        if (!Guid.TryParse(userIdClaim, out var parsedUserId))
        {
            throw new UnauthorizedAccessException("Ogiltigt användar-ID i token.");
        }

        return parsedUserId;
    }

    /// <summary>
    /// Hämtar användarnamn från JWT token claims
    /// </summary>
    /// <param name="principal">ClaimsPrincipal från HttpContext.User</param>
    /// <returns>Användarnamn</returns>
    public static string? GetUsername(this ClaimsPrincipal principal)
    {
        return principal?.FindFirst(ClaimTypes.Name)?.Value;
    }

    /// <summary>
    /// Hämtar e-post från JWT token claims
    /// </summary>
    /// <param name="principal">ClaimsPrincipal från HttpContext.User</param>
    /// <returns>E-postadress</returns>
    public static string? GetEmail(this ClaimsPrincipal principal)
    {
        return principal?.FindFirst(ClaimTypes.Email)?.Value;
    }
}
