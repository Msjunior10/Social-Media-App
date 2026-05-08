using Microsoft.AspNetCore.Http;

namespace SocialTDD.Api.Models;

public class CreateDirectMessageFormRequest
{
    public Guid RecipientId { get; set; }
    public string? Message { get; set; }
    public IFormFile? Media { get; set; }
}