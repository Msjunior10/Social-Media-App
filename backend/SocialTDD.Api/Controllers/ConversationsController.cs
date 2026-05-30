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
public class ConversationsController : ControllerBase
{
    private static readonly string[] AllowedExternalGifHosts =
    {
        "giphy.com",
        "media.giphy.com",
        "media0.giphy.com",
        "media1.giphy.com",
        "media2.giphy.com",
        "media3.giphy.com",
        "media4.giphy.com",
        "i.giphy.com"
    };

    private static readonly HashSet<string> AllowedMediaExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg", ".jpeg", ".png", ".gif", ".webp", ".mp4", ".webm", ".ogg"
    };

    private const long MaxMediaSizeBytes = 25 * 1024 * 1024;

    private readonly IConversationService _conversationService;
    private readonly ILogger<ConversationsController> _logger;
    private readonly IWebHostEnvironment _environment;

    public ConversationsController(IConversationService conversationService, ILogger<ConversationsController> logger, IWebHostEnvironment environment)
    {
        _conversationService = conversationService;
        _logger = logger;
        _environment = environment;
    }

    [HttpPost]
    public async Task<ActionResult<ConversationResponse>> CreateConversation([FromBody] CreateConversationRequest request)
    {
        try
        {
            var currentUserId = User.GetUserId();
            var createdConversation = await _conversationService.CreateGroupConversationAsync(currentUserId, request);
            return Ok(createdConversation);
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning(ex, "Otillåtet försök att skapa konversation");
            return Unauthorized(new ErrorResponse(ErrorCodes.UNAUTHORIZED, ex.Message));
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning("Valideringsfel vid skapande av konversation: {Message}", ex.Message);
            return BadRequest(new ErrorResponse(ErrorCodes.VALIDATION_ERROR, ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ett oväntat fel uppstod vid skapande av konversation");
            return StatusCode(500, new ErrorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, "Ett oväntat fel uppstod. Försök igen senare."));
        }
    }

    [HttpGet]
    public async Task<ActionResult<List<ConversationResponse>>> GetMyConversations()
    {
        try
        {
            var currentUserId = User.GetUserId();
            var conversations = await _conversationService.GetMyConversationsAsync(currentUserId);
            return Ok(conversations);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning("Valideringsfel vid hämtning av konversationer: {Message}", ex.Message);
            return BadRequest(new ErrorResponse(ErrorCodes.INVALID_USER_ID, ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ett oväntat fel uppstod vid hämtning av konversationer");
            return StatusCode(500, new ErrorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, "Ett oväntat fel uppstod. Försök igen senare."));
        }
    }

    [HttpGet("direct/{otherUserId:guid}")]
    public async Task<ActionResult<ConversationResponse>> GetOrCreateDirectConversation(Guid otherUserId)
    {
        try
        {
            var currentUserId = User.GetUserId();
            var conversation = await _conversationService.GetOrCreateDirectConversationAsync(currentUserId, otherUserId);
            return Ok(conversation);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning("Valideringsfel vid hämtning av direktkonversation: {Message}", ex.Message);
            return BadRequest(new ErrorResponse(ErrorCodes.VALIDATION_ERROR, ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ett oväntat fel uppstod vid hämtning av direktkonversation");
            return StatusCode(500, new ErrorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, "Ett oväntat fel uppstod. Försök igen senare."));
        }
    }

    [HttpGet("{conversationId:guid}/messages")]
    public async Task<ActionResult<List<ConversationMessageResponse>>> GetMessages(Guid conversationId)
    {
        try
        {
            var currentUserId = User.GetUserId();
            var messages = await _conversationService.GetMessagesAsync(currentUserId, conversationId);
            return Ok(messages);
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning(ex, "Otillåtet försök att läsa konversationsmeddelanden: {ConversationId}", conversationId);
            return Unauthorized(new ErrorResponse(ErrorCodes.UNAUTHORIZED, ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ett oväntat fel uppstod vid hämtning av konversationsmeddelanden");
            return StatusCode(500, new ErrorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, "Ett oväntat fel uppstod. Försök igen senare."));
        }
    }

    [HttpPost("{conversationId:guid}/messages")]
    [RequestFormLimits(MultipartBodyLengthLimit = MaxMediaSizeBytes)]
    [RequestSizeLimit(MaxMediaSizeBytes)]
    public async Task<ActionResult<ConversationMessageResponse>> SendMessage(Guid conversationId, [FromForm] CreateConversationMessageFormRequest request)
    {
        try
        {
            var currentUserId = User.GetUserId();
            if (request == null)
            {
                return BadRequest(new ErrorResponse(ErrorCodes.VALIDATION_ERROR, "Request body saknas."));
            }

            if (request.Media != null)
            {
                var mediaValidationError = ValidateMedia(request.Media);
                if (mediaValidationError != null)
                {
                    return BadRequest(new ErrorResponse(ErrorCodes.VALIDATION_ERROR, mediaValidationError));
                }
            }

            if (!string.IsNullOrWhiteSpace(request.GifUrl))
            {
                var gifUrlValidationError = ValidateExternalGifUrl(request.GifUrl);
                if (gifUrlValidationError != null)
                {
                    return BadRequest(new ErrorResponse(ErrorCodes.VALIDATION_ERROR, gifUrlValidationError));
                }
            }

            var mediaUrl = request.Media != null
                ? await SaveConversationMessageMediaAsync(request.Media)
                : null;

            var createdMessage = await _conversationService.SendMessageAsync(currentUserId, conversationId, new CreateConversationMessageRequest
            {
                Message = request.Message ?? string.Empty,
                MediaUrl = mediaUrl,
                GifUrl = string.IsNullOrWhiteSpace(request.GifUrl) ? null : request.GifUrl.Trim()
            });
            return Ok(createdMessage);
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning(ex, "Otillåtet försök att skicka konversationsmeddelande: {ConversationId}", conversationId);
            return Unauthorized(new ErrorResponse(ErrorCodes.UNAUTHORIZED, ex.Message));
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning("Valideringsfel vid skickande av konversationsmeddelande: {Message}", ex.Message);
            return BadRequest(new ErrorResponse(ErrorCodes.VALIDATION_ERROR, ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ett oväntat fel uppstod vid skickande av konversationsmeddelande");
            return StatusCode(500, new ErrorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, "Ett oväntat fel uppstod. Försök igen senare."));
        }
    }

    private string? ValidateMedia(IFormFile media)
    {
        return MediaUploadValidation.Validate(
            media,
            AllowedMediaExtensions,
            MaxMediaSizeBytes,
            "Endast JPG, PNG, GIF, WEBP, MP4, WEBM och OGG stöds i gruppkonversationer.");
    }

    private static string? ValidateExternalGifUrl(string? gifUrl)
    {
        if (string.IsNullOrWhiteSpace(gifUrl))
        {
            return null;
        }

        if (!Uri.TryCreate(gifUrl, UriKind.Absolute, out var uri))
        {
            return "The selected GIF URL is invalid.";
        }

        if (!string.Equals(uri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase))
        {
            return "The selected GIF URL must use HTTPS.";
        }

        var isAllowedHost = AllowedExternalGifHosts.Any(host => string.Equals(uri.Host, host, StringComparison.OrdinalIgnoreCase));
        if (!isAllowedHost)
        {
            return "Only trusted GIPHY URLs are allowed for GIF sharing.";
        }

        return null;
    }

    private async Task<string> SaveConversationMessageMediaAsync(IFormFile media)
    {
        var webRootPath = _environment.WebRootPath;
        if (string.IsNullOrWhiteSpace(webRootPath))
        {
            webRootPath = Path.Combine(_environment.ContentRootPath, "wwwroot");
        }

        var uploadsDirectory = Path.Combine(webRootPath, "uploads", "conversations");
        Directory.CreateDirectory(uploadsDirectory);

        var extension = Path.GetExtension(media.FileName);
        var fileName = $"{Guid.NewGuid():N}{extension}";
        var filePath = Path.Combine(uploadsDirectory, fileName);

        await using var stream = System.IO.File.Create(filePath);
        await media.CopyToAsync(stream);

        return $"/uploads/conversations/{fileName}";
    }
}
