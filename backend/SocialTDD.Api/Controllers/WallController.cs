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
public class WallController : ControllerBase
{
    private readonly IWallService _wallService;
    private readonly ILogger<WallController> _logger;

    public WallController(IWallService wallService, ILogger<WallController> logger)
    {
        _wallService = wallService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<List<PostResponse>>> GetWall()
    {
        try
        {
            // Hämta UserId från JWT token
            var userId = User.GetUserId();
            var result = await _wallService.GetWallAsync(userId);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning("Ogiltigt argument vid hämtning av vägg: {Message}", ex.Message);
            return BadRequest(new ErrorResponse(ErrorCodes.INVALID_USER_ID, ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ett oväntat fel uppstod vid hämtning av vägg");
            return StatusCode(500, new ErrorResponse(
                ErrorCodes.INTERNAL_SERVER_ERROR, 
                "Ett oväntat fel uppstod. Försök igen senare."
            ));
        }
    }
}