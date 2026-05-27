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
public class ConversationsController : ControllerBase
{
    private readonly IConversationService _conversationService;
    private readonly ILogger<ConversationsController> _logger;

    public ConversationsController(IConversationService conversationService, ILogger<ConversationsController> logger)
    {
        _conversationService = conversationService;
        _logger = logger;
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
    public async Task<ActionResult<ConversationMessageResponse>> SendMessage(Guid conversationId, [FromBody] CreateConversationMessageRequest request)
    {
        try
        {
            var currentUserId = User.GetUserId();
            var createdMessage = await _conversationService.SendMessageAsync(currentUserId, conversationId, request);
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
}
