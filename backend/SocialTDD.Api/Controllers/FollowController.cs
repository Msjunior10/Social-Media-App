using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SocialTDD.Api.Extensions;
using SocialTDD.Api.Models;
using SocialTDD.Application.DTOs;
using SocialTDD.Application.Interfaces;

namespace SocialTDD.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class FollowController : ControllerBase
{
    private readonly IFollowService _followService;
    private readonly ILogger<FollowController> _logger;

    public FollowController(IFollowService followService, ILogger<FollowController> logger)
    {
        _followService = followService;
        _logger = logger;
    }

    [HttpPost]
    public async Task<ActionResult<FollowResponse>> FollowUser([FromBody] CreateFollowRequest request)
    {
        try
        {
            _logger.LogInformation("FollowUser endpoint anropad. User authenticated: {IsAuthenticated}", User.Identity?.IsAuthenticated);
            
            if (request == null)
            {
                _logger.LogWarning("FollowUser anropad utan request body");
                return BadRequest(new ErrorResponse(ErrorCodes.VALIDATION_ERROR, "Request body saknas."));
            }

            // Hämta FollowerId från JWT token
            var followerId = User.GetUserId();
            _logger.LogInformation("FollowerId från token: {FollowerId}, FollowingId från request: {FollowingId}", followerId, request.FollowingId);
            
            // Kontrollera om FollowingId är tomt eller ogiltigt
            if (request.FollowingId == Guid.Empty)
            {
                _logger.LogWarning("FollowingId är tomt eller ogiltigt. FollowingId: {FollowingId}", request.FollowingId);
                return BadRequest(new ErrorResponse(ErrorCodes.INVALID_USER_ID, "FollowingId är obligatoriskt och måste vara ett giltigt användar-ID."));
            }
            
            // Sätt FollowerId från token för säkerhet
            var authenticatedRequest = new CreateFollowRequest
            {
                FollowerId = followerId,
                FollowingId = request.FollowingId
            };
            
            var result = await _followService.FollowUserAsync(authenticatedRequest);
            return Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning(ex, "Autentiseringsfel vid följning av användare");
            return Unauthorized(new ErrorResponse(ErrorCodes.UNAUTHORIZED, ex.Message));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new ErrorResponse(ErrorCodes.INVALID_USER_ID, ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new ErrorResponse(ErrorCodes.ALREADY_FOLLOWING, ex.Message));
        }
        catch (FluentValidation.ValidationException ex)
        {
            var details = new Dictionary<string, object>
            {
                { "errors", ex.Errors.Select(e => new { property = e.PropertyName, message = e.ErrorMessage }) }
            };
            return BadRequest(new ErrorResponse(ErrorCodes.VALIDATION_ERROR, ex.Message, details));
        }
        catch (Exception ex)
        {
            Guid? followerId = null;
            try
            {
                followerId = User.GetUserId();
            }
            catch
            {
                // Ignorera om vi inte kan hämta userId
            }
            
            _logger.LogError(ex, "Ett oväntat fel uppstod vid följning av användare. FollowerId: {FollowerId}, FollowingId: {FollowingId}", 
                followerId, request?.FollowingId);
            return StatusCode(500, new ErrorResponse(
                ErrorCodes.INTERNAL_SERVER_ERROR,
                "Ett oväntat fel uppstod vid följning av användare. Försök igen senare."
            ));
        }
    }

    [HttpDelete("{followingId}")]
    public async Task<IActionResult> UnfollowUser(Guid followingId)
    {
        try
        {
            // Hämta FollowerId från JWT token
            var followerId = User.GetUserId();
            await _followService.UnfollowUserAsync(followerId, followingId);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new ErrorResponse(ErrorCodes.USER_NOT_FOUND, ex.Message));
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning(ex, "Autentiseringsfel vid avföljning av användare");
            return Unauthorized(new ErrorResponse(ErrorCodes.UNAUTHORIZED, ex.Message));
        }
        catch (Exception ex)
        {
            Guid? followerId = null;
            try
            {
                followerId = User.GetUserId();
            }
            catch
            {
                // Ignorera om vi inte kan hämta userId
            }
            
            _logger.LogError(ex, "Ett oväntat fel uppstod vid avföljning av användare. FollowerId: {FollowerId}, FollowingId: {FollowingId}", 
                followerId, followingId);
            return StatusCode(500, new ErrorResponse(
                ErrorCodes.INTERNAL_SERVER_ERROR,
                "Ett oväntat fel uppstod vid avföljning av användare. Försök igen senare."
            ));
        }
    }

    [HttpGet("followers/{userId}")]
    public async Task<ActionResult<List<FollowResponse>>> GetFollowers(Guid userId)
    {
        try
        {
            var result = await _followService.GetFollowersAsync(userId);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new ErrorResponse(ErrorCodes.INVALID_USER_ID, ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ett oväntat fel uppstod vid hämtning av följare. UserId: {UserId}", userId);
            return StatusCode(500, new ErrorResponse(
                ErrorCodes.INTERNAL_SERVER_ERROR,
                "Ett oväntat fel uppstod vid hämtning av följare. Försök igen senare."
            ));
        }
    }

    [HttpGet("following/{userId}")]
    public async Task<ActionResult<List<FollowResponse>>> GetFollowing(Guid userId)
    {
        try
        {
            var result = await _followService.GetFollowingAsync(userId);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new ErrorResponse(ErrorCodes.INVALID_USER_ID, ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ett oväntat fel uppstod vid hämtning av följda användare. UserId: {UserId}", userId);
            return StatusCode(500, new ErrorResponse(
                ErrorCodes.INTERNAL_SERVER_ERROR,
                "Ett oväntat fel uppstod vid hämtning av följda användare. Försök igen senare."
            ));
        }
    }

    [HttpGet("followers")]
    public async Task<ActionResult<List<FollowResponse>>> GetMyFollowers()
    {
        try
        {
            // Hämta UserId från JWT token
            var userId = User.GetUserId();
            var result = await _followService.GetFollowersAsync(userId);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new ErrorResponse(ErrorCodes.INVALID_USER_ID, ex.Message));
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning(ex, "Autentiseringsfel vid hämtning av mina följare");
            return Unauthorized(new ErrorResponse(ErrorCodes.UNAUTHORIZED, ex.Message));
        }
        catch (Exception ex)
        {
            Guid? userId = null;
            try
            {
                userId = User.GetUserId();
            }
            catch
            {
                // Ignorera om vi inte kan hämta userId
            }
            
            _logger.LogError(ex, "Ett oväntat fel uppstod vid hämtning av mina följare. UserId: {UserId}", userId);
            return StatusCode(500, new ErrorResponse(
                ErrorCodes.INTERNAL_SERVER_ERROR,
                "Ett oväntat fel uppstod vid hämtning av följare. Försök igen senare."
            ));
        }
    }

    [HttpGet("following")]
    public async Task<ActionResult<List<FollowResponse>>> GetMyFollowing()
    {
        try
        {
            // Hämta UserId från JWT token
            var userId = User.GetUserId();
            var result = await _followService.GetFollowingAsync(userId);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new ErrorResponse(ErrorCodes.INVALID_USER_ID, ex.Message));
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning(ex, "Autentiseringsfel vid hämtning av mina följda användare");
            return Unauthorized(new ErrorResponse(ErrorCodes.UNAUTHORIZED, ex.Message));
        }
        catch (Exception ex)
        {
            Guid? userId = null;
            try
            {
                userId = User.GetUserId();
            }
            catch
            {
                // Ignorera om vi inte kan hämta userId
            }
            
            _logger.LogError(ex, "Ett oväntat fel uppstod vid hämtning av mina följda användare. UserId: {UserId}", userId);
            return StatusCode(500, new ErrorResponse(
                ErrorCodes.INTERNAL_SERVER_ERROR,
                "Ett oväntat fel uppstod vid hämtning av följda användare. Försök igen senare."
            ));
        }
    }
}