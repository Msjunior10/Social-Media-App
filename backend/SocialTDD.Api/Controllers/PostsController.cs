using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
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
    private static readonly HashSet<string> AllowedImageExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg", ".jpeg", ".png", ".gif", ".webp"
    };

    private const long MaxImageSizeBytes = 5 * 1024 * 1024;

    private readonly IPostService _postService;
    private readonly ITimelineService _timelineService;
    private readonly ILogger<PostsController> _logger;
    private readonly IWebHostEnvironment _environment;

    public PostsController(IPostService postService, ITimelineService timelineService, ILogger<PostsController> logger, IWebHostEnvironment environment)
    {
        _postService = postService;
        _timelineService = timelineService;
        _logger = logger;
        _environment = environment;
    }

    [HttpPost]
    [RequestFormLimits(MultipartBodyLengthLimit = MaxImageSizeBytes)]
    [RequestSizeLimit(MaxImageSizeBytes)]
    public async Task<ActionResult<PostResponse>> CreatePost([FromForm] CreatePostFormRequest requestDto)
    {
        try
        {
            _logger.LogInformation("CreatePost endpoint anropad. User authenticated: {IsAuthenticated}", User.Identity?.IsAuthenticated);
            
            if (requestDto == null)
            {
                _logger.LogWarning("CreatePost anropad utan request body");
                return BadRequest(new ErrorResponse(ErrorCodes.VALIDATION_ERROR, "Request body saknas."));
            }
            
            _logger.LogInformation("Request body: Message length={MessageLength}, HasImage={HasImage}", requestDto.Message?.Length ?? 0, requestDto.Image != null);
            
            // Hämta UserId från JWT token
            var userId = User.GetUserId();
            _logger.LogInformation("SenderId från token: {SenderId}", userId);
            
            // Kontrollera om Message är tomt eller null
            if (string.IsNullOrWhiteSpace(requestDto.Message))
            {
                _logger.LogWarning("Message är tomt eller null. Message length: {MessageLength}", requestDto.Message?.Length ?? 0);
                return BadRequest(new ErrorResponse(ErrorCodes.VALIDATION_ERROR, "Meddelande är obligatoriskt och får inte vara tomt."));
            }

            if (requestDto.Image != null)
            {
                var imageValidationError = ValidateImage(requestDto.Image);
                if (imageValidationError != null)
                {
                    return BadRequest(new ErrorResponse(ErrorCodes.VALIDATION_ERROR, imageValidationError));
                }
            }

            var imageUrl = requestDto.Image != null
                ? await SavePostImageAsync(requestDto.Image)
                : null;
            
            // Mappa från DTO till Request och sätt SenderId från token för säkerhet
            var authenticatedRequest = new CreatePostRequest
            {
                SenderId = userId,
                Message = requestDto.Message,
                ImageUrl = imageUrl
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
            var result = await _timelineService.GetTimelineAsync(userId, userId);
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
            var currentUserId = User.GetUserId();
            var result = await _timelineService.GetTimelineAsync(userId, currentUserId);
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

    [HttpPost("{postId}/likes")]
    public async Task<ActionResult<PostResponse>> LikePost(Guid postId)
    {
        try
        {
            var userId = User.GetUserId();
            var result = await _postService.LikePostAsync(postId, userId);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new ErrorResponse(ErrorCodes.POST_NOT_FOUND, ex.Message));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new ErrorResponse(ErrorCodes.INVALID_USER_ID, ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ett oväntat fel uppstod vid gillning av inlägg {PostId}", postId);
            return StatusCode(500, new ErrorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, "Ett oväntat fel uppstod. Försök igen senare."));
        }
    }

    [HttpDelete("{postId}/likes")]
    public async Task<ActionResult<PostResponse>> UnlikePost(Guid postId)
    {
        try
        {
            var userId = User.GetUserId();
            var result = await _postService.UnlikePostAsync(postId, userId);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new ErrorResponse(ErrorCodes.POST_NOT_FOUND, ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ett oväntat fel uppstod vid borttagning av gillning på inlägg {PostId}", postId);
            return StatusCode(500, new ErrorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, "Ett oväntat fel uppstod. Försök igen senare."));
        }
    }

    [HttpPost("{postId}/repost")]
    public async Task<ActionResult<PostResponse>> Repost(Guid postId)
    {
        try
        {
            var userId = User.GetUserId();
            var result = await _postService.RepostAsync(postId, userId);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new ErrorResponse(ErrorCodes.POST_NOT_FOUND, ex.Message));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new ErrorResponse(ErrorCodes.VALIDATION_ERROR, ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ett oväntat fel uppstod vid återpublicering av inlägg {PostId}", postId);
            return StatusCode(500, new ErrorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, "Ett oväntat fel uppstod. Försök igen senare."));
        }
    }

    [HttpDelete("{postId}/repost")]
    public async Task<ActionResult<PostResponse>> RemoveRepost(Guid postId)
    {
        try
        {
            var userId = User.GetUserId();
            var result = await _postService.RemoveRepostAsync(postId, userId);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new ErrorResponse(ErrorCodes.POST_NOT_FOUND, ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ett oväntat fel uppstod vid borttagning av återpublicering {PostId}", postId);
            return StatusCode(500, new ErrorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, "Ett oväntat fel uppstod. Försök igen senare."));
        }
    }

    [HttpPost("{postId}/comments")]
    public async Task<ActionResult<PostCommentResponse>> AddComment(Guid postId, [FromBody] CreatePostCommentRequest request)
    {
        try
        {
            if (request == null)
            {
                return BadRequest(new ErrorResponse(ErrorCodes.VALIDATION_ERROR, "Request body saknas."));
            }

            var userId = User.GetUserId();
            var result = await _postService.AddCommentAsync(postId, userId, request);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
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
        catch (ArgumentException ex)
        {
            return BadRequest(new ErrorResponse(ErrorCodes.INVALID_USER_ID, ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ett oväntat fel uppstod vid kommentering av inlägg {PostId}", postId);
            return StatusCode(500, new ErrorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, "Ett oväntat fel uppstod. Försök igen senare."));
        }
    }

    [HttpPut("{postId}/comments/{commentId}")]
    public async Task<ActionResult<PostCommentResponse>> UpdateComment(Guid postId, Guid commentId, [FromBody] CreatePostCommentRequest request)
    {
        try
        {
            if (request == null)
            {
                return BadRequest(new ErrorResponse(ErrorCodes.VALIDATION_ERROR, "Request body saknas."));
            }

            var userId = User.GetUserId();
            var result = await _postService.UpdateCommentAsync(postId, commentId, userId, request);
            return Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new ErrorResponse(ErrorCodes.FORBIDDEN, ex.Message));
        }
        catch (KeyNotFoundException ex)
        {
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
            _logger.LogError(ex, "Ett oväntat fel uppstod vid uppdatering av kommentar {CommentId} på inlägg {PostId}", commentId, postId);
            return StatusCode(500, new ErrorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, "Ett oväntat fel uppstod. Försök igen senare."));
        }
    }

    [HttpDelete("{postId}/comments/{commentId}")]
    public async Task<IActionResult> DeleteComment(Guid postId, Guid commentId)
    {
        try
        {
            var userId = User.GetUserId();
            await _postService.DeleteCommentAsync(postId, commentId, userId);
            return NoContent();
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new ErrorResponse(ErrorCodes.FORBIDDEN, ex.Message));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new ErrorResponse(ErrorCodes.POST_NOT_FOUND, ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ett oväntat fel uppstod vid borttagning av kommentar {CommentId} från inlägg {PostId}", commentId, postId);
            return StatusCode(500, new ErrorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, "Ett oväntat fel uppstod. Försök igen senare."));
        }
    }

    [HttpGet("saved")]
    public async Task<ActionResult<List<PostResponse>>> GetSavedPosts()
    {
        try
        {
            var userId = User.GetUserId();
            var result = await _postService.GetSavedPostsAsync(userId);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new ErrorResponse(ErrorCodes.INVALID_USER_ID, ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ett oväntat fel uppstod vid hämtning av sparade inlägg");
            return StatusCode(500, new ErrorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, "Ett oväntat fel uppstod. Försök igen senare."));
        }
    }

    [HttpPost("{postId}/bookmark")]
    public async Task<ActionResult<PostResponse>> BookmarkPost(Guid postId)
    {
        try
        {
            var userId = User.GetUserId();
            var result = await _postService.BookmarkPostAsync(postId, userId);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new ErrorResponse(ErrorCodes.POST_NOT_FOUND, ex.Message));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new ErrorResponse(ErrorCodes.INVALID_USER_ID, ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ett oväntat fel uppstod vid sparning av inlägg {PostId}", postId);
            return StatusCode(500, new ErrorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, "Ett oväntat fel uppstod. Försök igen senare."));
        }
    }

    [HttpDelete("{postId}/bookmark")]
    public async Task<ActionResult<PostResponse>> RemoveBookmark(Guid postId)
    {
        try
        {
            var userId = User.GetUserId();
            var result = await _postService.RemoveBookmarkAsync(postId, userId);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new ErrorResponse(ErrorCodes.POST_NOT_FOUND, ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ett oväntat fel uppstod vid borttagning av sparat inlägg {PostId}", postId);
            return StatusCode(500, new ErrorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, "Ett oväntat fel uppstod. Försök igen senare."));
        }
    }

    private string? ValidateImage(IFormFile image)
    {
        if (image.Length <= 0)
        {
            return "Den uppladdade bilden är tom.";
        }

        if (image.Length > MaxImageSizeBytes)
        {
            return $"Bilden får inte vara större än {MaxImageSizeBytes / (1024 * 1024)} MB.";
        }

        var extension = Path.GetExtension(image.FileName);
        if (string.IsNullOrWhiteSpace(extension) || !AllowedImageExtensions.Contains(extension))
        {
            return "Endast JPG, PNG, GIF och WEBP-bilder är tillåtna.";
        }

        return null;
    }

    private async Task<string> SavePostImageAsync(IFormFile image)
    {
        var webRootPath = string.IsNullOrWhiteSpace(_environment.WebRootPath)
            ? Path.Combine(_environment.ContentRootPath, "wwwroot")
            : _environment.WebRootPath;

        var uploadsDirectory = Path.Combine(webRootPath, "uploads", "posts");
        Directory.CreateDirectory(uploadsDirectory);

        var extension = Path.GetExtension(image.FileName).ToLowerInvariant();
        var fileName = $"{Guid.NewGuid()}{extension}";
        var filePath = Path.Combine(uploadsDirectory, fileName);

        await using var stream = new FileStream(filePath, FileMode.Create);
        await image.CopyToAsync(stream);

        return $"{Request.Scheme}://{Request.Host}/uploads/posts/{fileName}";
    }
}