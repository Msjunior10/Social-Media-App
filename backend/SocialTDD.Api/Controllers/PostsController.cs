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
public class PostsController : ControllerBase
{
    private readonly IPostService _postService;
    private readonly ITimelineService _timelineService;
    private readonly ILogger<PostsController> _logger;

    public PostsController(IPostService postService, ITimelineService timelineService, ILogger<PostsController> logger)
    {
        _postService = postService;
        _timelineService = timelineService;
        _logger = logger;
    }

    [HttpPost]
    public async Task<ActionResult<PostResponse>> CreatePost([FromBody] CreatePostRequestDto requestDto)
    {
        try
        {
            _logger.LogInformation("CreatePost endpoint anropad. User authenticated: {IsAuthenticated}", User.Identity?.IsAuthenticated);
            
            if (requestDto == null)
            {
                _logger.LogWarning("CreatePost anropad utan request body");
                return BadRequest(new ErrorResponse(ErrorCodes.VALIDATION_ERROR, "Request body saknas."));
            }
            
            _logger.LogInformation("Request body: RecipientId={RecipientId}, Message length={MessageLength}", 
                requestDto.RecipientId, requestDto.Message?.Length ?? 0);
            
            // Hämta UserId från JWT token
            var userId = User.GetUserId();
            _logger.LogInformation("SenderId från token: {SenderId}, RecipientId från request: {RecipientId}", userId, requestDto.RecipientId);
            
            // Kontrollera om RecipientId är tomt eller ogiltigt
            if (requestDto.RecipientId == Guid.Empty)
            {
                _logger.LogWarning("RecipientId är tomt eller ogiltigt. RecipientId: {RecipientId}", requestDto.RecipientId);
                return BadRequest(new ErrorResponse(ErrorCodes.INVALID_RECIPIENT_ID, "RecipientId är obligatoriskt och måste vara ett giltigt användar-ID."));
            }
            
            // Kontrollera om Message är tomt eller null
            if (string.IsNullOrWhiteSpace(requestDto.Message))
            {
                _logger.LogWarning("Message är tomt eller null. Message length: {MessageLength}", requestDto.Message?.Length ?? 0);
                return BadRequest(new ErrorResponse(ErrorCodes.VALIDATION_ERROR, "Meddelande är obligatoriskt och får inte vara tomt."));
            }
            
            // Mappa från DTO till Request och sätt SenderId från token för säkerhet
            var authenticatedRequest = new CreatePostRequest
            {
                SenderId = userId,
                RecipientId = requestDto.RecipientId,
                Message = requestDto.Message
            };
            
            var result = await _postService.CreatePostAsync(authenticatedRequest);
            return Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning(ex, "Autentiseringsfel vid skapande av inlägg");
            return Unauthorized(new ErrorResponse(ErrorCodes.UNAUTHORIZED, ex.Message));
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning("Ogiltigt argument vid skapande av inlägg: {Message}", ex.Message);
            return BadRequest(new ErrorResponse(ErrorCodes.INVALID_RECIPIENT_ID, ex.Message));
        }
        catch (FluentValidation.ValidationException ex)
        {
            _logger.LogWarning("Valideringsfel vid skapande av inlägg: {Message}", ex.Message);
            var details = new Dictionary<string, object>
            {
                { "errors", ex.Errors.Select(e => new { property = e.PropertyName, message = e.ErrorMessage }) }
            };
            return BadRequest(new ErrorResponse(ErrorCodes.VALIDATION_ERROR, ex.Message, details));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ett oväntat fel uppstod vid skapande av inlägg. Request: RecipientId={RecipientId}, Message length={MessageLength}", 
                requestDto?.RecipientId, requestDto?.Message?.Length ?? 0);
            return StatusCode(500, new ErrorResponse(
                ErrorCodes.INTERNAL_SERVER_ERROR, 
                "Ett oväntat fel uppstod. Försök igen senare."
            ));
        }
    }

    [HttpGet("timeline")]
    public async Task<ActionResult<List<PostResponse>>> GetTimeline()
    {
        try
        {
            // Hämta UserId från JWT token
            var userId = User.GetUserId();
            var result = await _timelineService.GetTimelineAsync(userId);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning("Ogiltigt argument vid hämtning av tidslinje: {Message}", ex.Message);
            return BadRequest(new ErrorResponse(ErrorCodes.INVALID_USER_ID, ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ett oväntat fel uppstod vid hämtning av tidslinje");
            return StatusCode(500, new ErrorResponse(
                ErrorCodes.INTERNAL_SERVER_ERROR, 
                "Ett oväntat fel uppstod. Försök igen senare."
            ));
        }
    }
}