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
public class UserController : ControllerBase
{
    private readonly IUserService _userService;
    private readonly ILogger<UserController> _logger;

    public UserController(IUserService userService, ILogger<UserController> logger)
    {
        _userService = userService ?? throw new ArgumentNullException(nameof(userService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    [HttpGet("{userId}")]
    public async Task<ActionResult<UserResponse>> GetUserById(Guid userId)
    {
        try
        {
            var user = await _userService.GetUserByIdAsync(userId);
            if (user == null)
            {
                return NotFound(new ErrorResponse(ErrorCodes.USER_NOT_FOUND, $"Användare med ID {userId} hittades inte."));
            }
            return Ok(user);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ett oväntat fel uppstod vid hämtning av användare");
            return StatusCode(500, new ErrorResponse(
                ErrorCodes.INTERNAL_SERVER_ERROR,
                "Ett oväntat fel uppstod. Försök igen senare."
            ));
        }
    }

    [HttpGet("username/{username}")]
    public async Task<ActionResult<UserResponse>> GetUserByUsername(string username)
    {
        try
        {
            var user = await _userService.GetUserByUsernameAsync(username);
            if (user == null)
            {
                return NotFound(new ErrorResponse(ErrorCodes.USER_NOT_FOUND, $"Användare med användarnamn '{username}' hittades inte."));
            }
            return Ok(user);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ett oväntat fel uppstod vid hämtning av användare");
            return StatusCode(500, new ErrorResponse(
                ErrorCodes.INTERNAL_SERVER_ERROR,
                "Ett oväntat fel uppstod. Försök igen senare."
            ));
        }
    }

    [HttpGet("me")]
    public async Task<ActionResult<UserResponse>> GetCurrentUser()
    {
        try
        {
            var userId = User.GetUserId();
            var user = await _userService.GetCurrentUserAsync(userId);
            if (user == null)
            {
                return NotFound(new ErrorResponse(ErrorCodes.USER_NOT_FOUND, "Din användarprofil hittades inte."));
            }

            return Ok(user);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new ErrorResponse(ErrorCodes.UNAUTHORIZED, ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ett oväntat fel uppstod vid hämtning av aktuell användare");
            return StatusCode(500, new ErrorResponse(
                ErrorCodes.INTERNAL_SERVER_ERROR,
                "Ett oväntat fel uppstod. Försök igen senare."
            ));
        }
    }

    [HttpPut("me")]
    public async Task<ActionResult<UserResponse>> UpdateCurrentUserProfile([FromBody] UpdateUserProfileRequest request)
    {
        try
        {
            var userId = User.GetUserId();
            var updatedUser = await _userService.UpdateProfileAsync(userId, request);
            return Ok(updatedUser);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new ErrorResponse(ErrorCodes.UNAUTHORIZED, ex.Message));
        }
        catch (ArgumentException ex)
        {
            return NotFound(new ErrorResponse(ErrorCodes.USER_NOT_FOUND, ex.Message));
        }
        catch (FluentValidation.ValidationException ex)
        {
            var details = new Dictionary<string, object>
            {
                { "errors", ex.Errors.Select(e => new { property = e.PropertyName, message = e.ErrorMessage }) }
            };
            return BadRequest(new ErrorResponse(ErrorCodes.VALIDATION_ERROR, "Valideringsfel", details));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ett oväntat fel uppstod vid uppdatering av användarprofil");
            return StatusCode(500, new ErrorResponse(
                ErrorCodes.INTERNAL_SERVER_ERROR,
                "Ett oväntat fel uppstod. Försök igen senare."
            ));
        }
    }

    [HttpGet]
    public async Task<ActionResult<List<UserResponse>>> GetAllUsers()
    {
        try
        {
            var users = await _userService.GetAllUsersAsync();
            return Ok(users);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ett oväntat fel uppstod vid hämtning av användare");
            return StatusCode(500, new ErrorResponse(
                ErrorCodes.INTERNAL_SERVER_ERROR,
                "Ett oväntat fel uppstod. Försök igen senare."
            ));
        }
    }

    [HttpGet("search")]
    public async Task<ActionResult<List<UserResponse>>> SearchUsers([FromQuery] string q)
    {
        try
        {
            var users = await _userService.SearchUsersAsync(q ?? string.Empty);
            return Ok(users);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ett oväntat fel uppstod vid sökning av användare");
            return StatusCode(500, new ErrorResponse(
                ErrorCodes.INTERNAL_SERVER_ERROR,
                "Ett oväntat fel uppstod. Försök igen senare."
            ));
        }
    }
}
