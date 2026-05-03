namespace SocialTDD.Application.DTOs;

public class CreatePostRequest
{
    public Guid SenderId { get; set; }
    public string Message { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
}



