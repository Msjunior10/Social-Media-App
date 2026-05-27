namespace SocialTDD.Application.DTOs;

public class ConversationMessageResponse
{
    public Guid Id { get; set; }
    public Guid ConversationId { get; set; }
    public Guid SenderId { get; set; }
    public string SenderUsername { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? MediaUrl { get; set; }
    public string? GifUrl { get; set; }
    public DateTime CreatedAt { get; set; }
}
