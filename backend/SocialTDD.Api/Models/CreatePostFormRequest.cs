using Microsoft.AspNetCore.Http;

namespace SocialTDD.Api.Models;

public class CreatePostFormRequest
{
    public string Message { get; set; } = string.Empty;
    public IFormFile? Image { get; set; }
}