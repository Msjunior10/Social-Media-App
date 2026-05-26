namespace SocialTDD.Domain.Entities;

public class Conversation
{
    public Guid Id { get; set; }
    public Guid CreatedByUserId { get; set; }
    public string Title { get; set; } = string.Empty;
    public bool IsGroup { get; set; }
    public DateTime CreatedAt { get; set; }

    public User CreatedByUser { get; set; } = null!;
    public ICollection<ConversationMember> Members { get; set; } = new List<ConversationMember>();
    public ICollection<ConversationMessage> Messages { get; set; } = new List<ConversationMessage>();
    public ICollection<CallSession> CallSessions { get; set; } = new List<CallSession>();
}