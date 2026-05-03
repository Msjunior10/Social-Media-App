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
public class NotificationsController : ControllerBase
{
    private readonly INotificationService _notificationService;
    private readonly ILogger<NotificationsController> _logger;

    public NotificationsController(INotificationService notificationService, ILogger<NotificationsController> logger)
    {
        _notificationService = notificationService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<List<NotificationResponse>>> GetNotifications()
    {
        try
        {
            var userId = User.GetUserId();
            var result = await _notificationService.GetNotificationsAsync(userId);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new ErrorResponse(ErrorCodes.INVALID_USER_ID, ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ett oväntat fel uppstod vid hämtning av notiser");
            return StatusCode(500, new ErrorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, "Ett oväntat fel uppstod. Försök igen senare."));
        }
    }

    [HttpGet("unread-count")]
    public async Task<ActionResult<object>> GetUnreadCount()
    {
        try
        {
            var userId = User.GetUserId();
            var count = await _notificationService.GetUnreadCountAsync(userId);
            return Ok(new { count });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new ErrorResponse(ErrorCodes.INVALID_USER_ID, ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ett oväntat fel uppstod vid hämtning av antal olästa notiser");
            return StatusCode(500, new ErrorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, "Ett oväntat fel uppstod. Försök igen senare."));
        }
    }

    [HttpPut("{notificationId}/read")]
    public async Task<IActionResult> MarkAsRead(Guid notificationId)
    {
        try
        {
            var userId = User.GetUserId();
            await _notificationService.MarkAsReadAsync(notificationId, userId);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new ErrorResponse(ErrorCodes.NOTIFICATION_NOT_FOUND, ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ett oväntat fel uppstod vid markering av notis som läst");
            return StatusCode(500, new ErrorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, "Ett oväntat fel uppstod. Försök igen senare."));
        }
    }

    [HttpPut("read-all")]
    public async Task<IActionResult> MarkAllAsRead()
    {
        try
        {
            var userId = User.GetUserId();
            await _notificationService.MarkAllAsReadAsync(userId);
            return NoContent();
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new ErrorResponse(ErrorCodes.INVALID_USER_ID, ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ett oväntat fel uppstod vid markering av alla notiser som lästa");
            return StatusCode(500, new ErrorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, "Ett oväntat fel uppstod. Försök igen senare."));
        }
    }
}
