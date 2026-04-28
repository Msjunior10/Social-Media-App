using Microsoft.AspNetCore.Mvc;
using SocialTDD.Api.Models;
using SocialTDD.Application.DTOs;
using SocialTDD.Application.Interfaces;

namespace SocialTDD.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IUserService _userService;
    private readonly ILogger<AuthController> _logger;

    public AuthController(IUserService userService, ILogger<AuthController> logger)
    {
        _userService = userService ?? throw new ArgumentNullException(nameof(userService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register([FromBody] RegisterRequest request)
    {
        try
        {
            var result = await _userService.RegisterAsync(request);
            return Ok(result);
        }
        catch (FluentValidation.ValidationException ex)
        {
            _logger.LogWarning("Valideringsfel vid registrering: {Errors}", ex.Errors);
            var details = new Dictionary<string, object>
            {
                { "errors", ex.Errors.Select(e => new { property = e.PropertyName, message = e.ErrorMessage }) }
            };
            return BadRequest(new ErrorResponse(ErrorCodes.VALIDATION_ERROR, "Valideringsfel", details));
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning("Ogiltigt argument vid registrering: {Message}", ex.Message);
            return Conflict(new ErrorResponse(ErrorCodes.USER_ALREADY_EXISTS, ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ett oväntat fel uppstod vid registrering");
            return StatusCode(500, new ErrorResponse(
                ErrorCodes.INTERNAL_SERVER_ERROR, 
                "Ett oväntat fel uppstod. Försök igen senare."
            ));
        }
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginRequest request)
    {
        try
        {
            var result = await _userService.LoginAsync(request);
            return Ok(result);
        }
        catch (FluentValidation.ValidationException ex)
        {
            _logger.LogWarning("Valideringsfel vid inloggning: {Errors}", ex.Errors);
            var details = new Dictionary<string, object>
            {
                { "errors", ex.Errors.Select(e => new { property = e.PropertyName, message = e.ErrorMessage }) }
            };
            return BadRequest(new ErrorResponse(ErrorCodes.VALIDATION_ERROR, "Valideringsfel", details));
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning("Ogiltiga credentials vid inloggning: {Message}", ex.Message);
            return Unauthorized(new ErrorResponse(ErrorCodes.INVALID_CREDENTIALS, ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ett oväntat fel uppstod vid inloggning");
            return StatusCode(500, new ErrorResponse(
                ErrorCodes.INTERNAL_SERVER_ERROR, 
                "Ett oväntat fel uppstod. Försök igen senare."
            ));
        }
    }
}