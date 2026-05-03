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
            
            _logger.LogInformation("Request body: Message length={MessageLength}", requestDto.Message?.Length ?? 0);
            
            // Hämta UserId från JWT token
            var userId = User.GetUserId();
            _logger.LogInformation("SenderId från token: {SenderId}", userId);
            
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
            return BadRequest(new ErrorResponse(ErrorCodes.VALIDATION_ERROR, ex.Message));
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
            _logger.LogError(ex, "Ett oväntat fel uppstod vid skapande av inlägg. Message length={MessageLength}", 
                requestDto?.Message?.Length ?? 0);
            return StatusCode(500, new ErrorResponse(
                ErrorCodes.INTERNAL_SERVER_ERROR, 
                "Ett oväntat fel uppstod. Försök igen senare."
            ));
        }
    }

    [HttpPut("{postId}")]
    public async Task<ActionResult<PostResponse>> UpdatePost(Guid postId, [FromBody] UpdatePostRequest request)
    {
        try
        {
            if (request == null)
            {
                return BadRequest(new ErrorResponse(ErrorCodes.VALIDATION_ERROR, "Request body saknas."));
            }

            var userId = User.GetUserId();
            var result = await _postService.UpdatePostAsync(postId, userId, request);
            return Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning(ex, "Otillåtet försök att redigera inlägg {PostId}", postId);
            return StatusCode(403, new ErrorResponse(ErrorCodes.FORBIDDEN, ex.Message));
        }
        catch (KeyNotFoundException ex)
        {
            _logger.LogWarning(ex, "Inlägg hittades inte vid redigering {PostId}", postId);
            return NotFound(new ErrorResponse(ErrorCodes.POST_NOT_FOUND, ex.Message));
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
            _logger.LogError(ex, "Ett oväntat fel uppstod vid redigering av inlägg {PostId}", postId);
            return StatusCode(500, new ErrorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, "Ett oväntat fel uppstod. Försök igen senare."));
        }
    }

    [HttpDelete("{postId}")]
    public async Task<IActionResult> DeletePost(Guid postId)
    {
        try
        {
            var userId = User.GetUserId();
            await _postService.DeletePostAsync(postId, userId);
            return NoContent();
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning(ex, "Otillåtet försök att ta bort inlägg {PostId}", postId);
            return StatusCode(403, new ErrorResponse(ErrorCodes.FORBIDDEN, ex.Message));
        }
        catch (KeyNotFoundException ex)
        {
            _logger.LogWarning(ex, "Inlägg hittades inte vid borttagning {PostId}", postId);
            return NotFound(new ErrorResponse(ErrorCodes.POST_NOT_FOUND, ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ett oväntat fel uppstod vid borttagning av inlägg {PostId}", postId);
            return StatusCode(500, new ErrorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, "Ett oväntat fel uppstod. Försök igen senare."));
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

    [HttpGet("timeline/{userId}")]
    public async Task<ActionResult<List<PostResponse>>> GetTimelineByUserId(Guid userId)
    {
        try
        {
            var result = await _timelineService.GetTimelineAsync(userId);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning("Ogiltigt argument vid hämtning av användarens tidslinje: {Message}", ex.Message);
            return BadRequest(new ErrorResponse(ErrorCodes.INVALID_USER_ID, ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ett oväntat fel uppstod vid hämtning av användarens tidslinje");
            return StatusCode(500, new ErrorResponse(
                ErrorCodes.INTERNAL_SERVER_ERROR,
                "Ett oväntat fel uppstod. Försök igen senare."
            ));
        }
    }
}