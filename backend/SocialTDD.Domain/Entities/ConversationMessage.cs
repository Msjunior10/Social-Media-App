namespace SocialTDD.Domain.Entities;

public class ConversationMessage
{
    public Guid Id { get; set; }
    public Guid ConversationId { get; set; }
    public Guid SenderId { get; set; }
    public string Message { get; set; } = string.Empty;
    public string? MediaUrl { get; set; }
    public string? GifUrl { get; set; }
    public DateTime CreatedAt { get; set; }
    public bool IsSystemMessage { get; set; }

    public Conversation Conversation { get; set; } = null!;
    public User Sender { get; set; } = null!;
}