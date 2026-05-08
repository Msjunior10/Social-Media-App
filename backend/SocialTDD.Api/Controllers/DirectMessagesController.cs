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
public class DirectMessagesController : ControllerBase
{
    private static readonly HashSet<string> AllowedMediaExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg", ".jpeg", ".png", ".gif", ".webp", ".mp4", ".webm", ".ogg"
    };

    private const long MaxMediaSizeBytes = 25 * 1024 * 1024;

    private readonly IDirectMessageService _directMessageService;
    private readonly ILogger<DirectMessagesController> _logger;
    private readonly IWebHostEnvironment _environment;

    public DirectMessagesController(IDirectMessageService directMessageService, ILogger<DirectMessagesController> logger, IWebHostEnvironment environment)
    {
        _directMessageService = directMessageService;
        _logger = logger;
        _environment = environment;
    }

    [HttpPost]
    [RequestFormLimits(MultipartBodyLengthLimit = MaxMediaSizeBytes)]
    [RequestSizeLimit(MaxMediaSizeBytes)]
    public async Task<ActionResult<DirectMessageResponse>> SendDirectMessage([FromForm] CreateDirectMessageFormRequest request)
    {
        try
        {
            _logger.LogInformation("SendDirectMessage endpoint anropad. User authenticated: {IsAuthenticated}", User.Identity?.IsAuthenticated);
            
            if (request == null)
            {
                _logger.LogWarning("SendDirectMessage anropad utan request body");
                return BadRequest(new ErrorResponse(ErrorCodes.VALIDATION_ERROR, "Request body saknas."));
            }
            
            _logger.LogInformation("Request body: RecipientId={RecipientId}, Message length={MessageLength}, HasMedia={HasMedia}", 
                request.RecipientId, request.Message?.Length ?? 0, request.Media != null);
            
            // Hämta SenderId från JWT token
            var senderId = User.GetUserId();
            _logger.LogInformation("SenderId från token: {SenderId}, RecipientId från request: {RecipientId}", senderId, request.RecipientId);
            
            // Kontrollera om RecipientId är tomt eller ogiltigt
            if (request.RecipientId == Guid.Empty)
            {
                _logger.LogWarning("RecipientId är tomt eller ogiltigt. RecipientId: {RecipientId}", request.RecipientId);
                return BadRequest(new ErrorResponse(ErrorCodes.INVALID_RECIPIENT_ID, "RecipientId är obligatoriskt och måste vara ett giltigt användar-ID."));
            }

            if (request.Media != null)
            {
                var mediaValidationError = ValidateMedia(request.Media);
                if (mediaValidationError != null)
                {
                    return BadRequest(new ErrorResponse(ErrorCodes.VALIDATION_ERROR, mediaValidationError));
                }
            }

            var mediaUrl = request.Media != null
                ? await SaveDirectMessageMediaAsync(request.Media)
                : null;
            
            // Sätt SenderId från token för säkerhet
            var authenticatedRequest = new CreateDirectMessageRequest
            {
                SenderId = senderId,
                RecipientId = request.RecipientId,
                Message = request.Message ?? string.Empty,
                MediaUrl = mediaUrl
            };
            
            var result = await _directMessageService.SendDirectMessageAsync(authenticatedRequest);
            return Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning(ex, "Autentiseringsfel vid skickande av DM");
            return Unauthorized(new ErrorResponse(ErrorCodes.UNAUTHORIZED, ex.Message));
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning("Ogiltigt argument vid skickande av DM: {Message}", ex.Message);
            return BadRequest(new ErrorResponse(ErrorCodes.INVALID_RECIPIENT_ID, ex.Message));
        }
        catch (FluentValidation.ValidationException ex)
        {
            _logger.LogWarning("Valideringsfel vid skickande av DM: {Message}", ex.Message);
            var details = new Dictionary<string, object>
            {
                { "errors", ex.Errors.Select(e => new { property = e.PropertyName, message = e.ErrorMessage }) }
            };
            return BadRequest(new ErrorResponse(ErrorCodes.VALIDATION_ERROR, ex.Message, details));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ett oväntat fel uppstod vid skickande av DM. Request: RecipientId={RecipientId}, Message length={MessageLength}", 
                request?.RecipientId, request?.Message?.Length ?? 0);
            return StatusCode(500, new ErrorResponse(
                ErrorCodes.INTERNAL_SERVER_ERROR, 
                "Ett oväntat fel uppstod. Försök igen senare."
            ));
        }
    }

    [HttpGet("received")]
    public async Task<ActionResult<List<DirectMessageResponse>>> GetReceivedMessages()
    {
        try
        {
            // Hämta UserId från JWT token
            var userId = User.GetUserId();
            var result = await _directMessageService.GetReceivedMessagesAsync(userId);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning("Ogiltigt argument vid hämtning av DM: {Message}", ex.Message);
            return BadRequest(new ErrorResponse(ErrorCodes.INVALID_USER_ID, ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ett oväntat fel uppstod vid hämtning av DM");
            return StatusCode(500, new ErrorResponse(
                ErrorCodes.INTERNAL_SERVER_ERROR, 
                "Ett oväntat fel uppstod. Försök igen senare."
            ));
        }
    }

    [HttpGet]
    public async Task<ActionResult<List<DirectMessageResponse>>> GetInboxMessages()
    {
        try
        {
            var userId = User.GetUserId();
            var result = await _directMessageService.GetInboxAsync(userId);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning("Ogiltigt argument vid hämtning av DM-inkorg: {Message}", ex.Message);
            return BadRequest(new ErrorResponse(ErrorCodes.INVALID_USER_ID, ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ett oväntat fel uppstod vid hämtning av DM-inkorg");
            return StatusCode(500, new ErrorResponse(
                ErrorCodes.INTERNAL_SERVER_ERROR,
                "Ett oväntat fel uppstod. Försök igen senare."
            ));
        }
    }

    [HttpGet("conversation/{otherUserId:guid}")]
    public async Task<ActionResult<List<DirectMessageResponse>>> GetConversation(Guid otherUserId)
    {
        try
        {
            var userId = User.GetUserId();
            var result = await _directMessageService.GetConversationAsync(userId, otherUserId);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning("Ogiltigt argument vid hämtning av DM-konversation: {Message}", ex.Message);
            return BadRequest(new ErrorResponse(ErrorCodes.INVALID_USER_ID, ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ett oväntat fel uppstod vid hämtning av DM-konversation");
            return StatusCode(500, new ErrorResponse(
                ErrorCodes.INTERNAL_SERVER_ERROR,
                "Ett oväntat fel uppstod. Försök igen senare."
            ));
        }
    }

    [HttpPut("{messageId}/read")]
    public async Task<IActionResult> MarkAsRead(Guid messageId)
    {
        try
        {
            var userId = User.GetUserId();
            await _directMessageService.MarkAsReadAsync(messageId, userId);
            return NoContent();
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning(ex, "Otillåten markering av DM som läst: {MessageId}", messageId);
            return Unauthorized(new ErrorResponse(ErrorCodes.UNAUTHORIZED, ex.Message));
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning("Ogiltigt argument vid markering av DM som läst: {Message}", ex.Message);
            return BadRequest(new ErrorResponse(ErrorCodes.MESSAGE_NOT_FOUND, ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ett oväntat fel uppstod vid markering av DM som läst");
            return StatusCode(500, new ErrorResponse(
                ErrorCodes.INTERNAL_SERVER_ERROR, 
                "Ett oväntat fel uppstod. Försök igen senare."
            ));
        }
    }

    private string? ValidateMedia(IFormFile media)
    {
        return MediaUploadValidation.Validate(
            media,
            AllowedMediaExtensions,
            MaxMediaSizeBytes,
            "Endast JPG, PNG, GIF, WEBP, MP4, WEBM och OGG stöds i direktmeddelanden.");
    }

    private async Task<string> SaveDirectMessageMediaAsync(IFormFile media)
    {
        var webRootPath = _environment.WebRootPath;
        if (string.IsNullOrWhiteSpace(webRootPath))
        {
            webRootPath = Path.Combine(_environment.ContentRootPath, "wwwroot");
        }

        var uploadsDirectory = Path.Combine(webRootPath, "uploads", "directmessages");
        Directory.CreateDirectory(uploadsDirectory);

        var extension = Path.GetExtension(media.FileName);
        var fileName = $"{Guid.NewGuid():N}{extension}";
        var filePath = Path.Combine(uploadsDirectory, fileName);

        await using var stream = System.IO.File.Create(filePath);
        await media.CopyToAsync(stream);

        return $"/uploads/directmessages/{fileName}";
    }
}