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
public class DirectMessagesController : ControllerBase
{
    private readonly IDirectMessageService _directMessageService;
    private readonly ILogger<DirectMessagesController> _logger;

    public DirectMessagesController(IDirectMessageService directMessageService, ILogger<DirectMessagesController> logger)
    {
        _directMessageService = directMessageService;
        _logger = logger;
    }

    [HttpPost]
    public async Task<ActionResult<DirectMessageResponse>> SendDirectMessage([FromBody] CreateDirectMessageRequest request)
    {
        try
        {
            _logger.LogInformation("SendDirectMessage endpoint anropad. User authenticated: {IsAuthenticated}", User.Identity?.IsAuthenticated);
            
            if (request == null)
            {
                _logger.LogWarning("SendDirectMessage anropad utan request body");
                return BadRequest(new ErrorResponse(ErrorCodes.VALIDATION_ERROR, "Request body saknas."));
            }
            
            _logger.LogInformation("Request body: RecipientId={RecipientId}, Message length={MessageLength}", 
                request.RecipientId, request.Message?.Length ?? 0);
            
            // Hämta SenderId från JWT token
            var senderId = User.GetUserId();
            _logger.LogInformation("SenderId från token: {SenderId}, RecipientId från request: {RecipientId}", senderId, request.RecipientId);
            
            // Kontrollera om RecipientId är tomt eller ogiltigt
            if (request.RecipientId == Guid.Empty)
            {
                _logger.LogWarning("RecipientId är tomt eller ogiltigt. RecipientId: {RecipientId}", request.RecipientId);
                return BadRequest(new ErrorResponse(ErrorCodes.INVALID_RECIPIENT_ID, "RecipientId är obligatoriskt och måste vara ett giltigt användar-ID."));
            }
            
            // Sätt SenderId från token för säkerhet
            var authenticatedRequest = new CreateDirectMessageRequest
            {
                SenderId = senderId,
                RecipientId = request.RecipientId,
                Message = request.Message ?? string.Empty
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

    [HttpPut("{messageId}/read")]
    public async Task<IActionResult> MarkAsRead(Guid messageId)
    {
        try
        {
            await _directMessageService.MarkAsReadAsync(messageId);
            return NoContent();
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
}