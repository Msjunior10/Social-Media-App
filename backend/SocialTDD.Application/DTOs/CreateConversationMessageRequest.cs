namespace SocialTDD.Application.DTOs;

public class CreateConversationMessageRequest
{
    public string Message { get; set; } = string.Empty;
    public string? MediaUrl { get; set; }
    public string? GifUrl { get; set; }
}
