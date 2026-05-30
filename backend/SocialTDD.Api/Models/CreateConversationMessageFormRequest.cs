using Microsoft.AspNetCore.Http;

namespace SocialTDD.Api.Models;

public class CreateConversationMessageFormRequest
{
    public string? Message { get; set; }
    public IFormFile? Media { get; set; }
    public string? GifUrl { get; set; }
}