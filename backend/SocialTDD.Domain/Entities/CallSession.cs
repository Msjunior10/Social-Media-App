namespace SocialTDD.Domain.Entities;

public class CallSession
{
    public Guid Id { get; set; }
    public Guid ConversationId { get; set; }
    public Guid StartedByUserId { get; set; }
    public string CallType { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime StartedAt { get; set; }
    public DateTime? EndedAt { get; set; }

    public Conversation Conversation { get; set; } = null!;
    public User StartedByUser { get; set; } = null!;
}