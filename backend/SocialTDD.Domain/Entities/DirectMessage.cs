namespace SocialTDD.Domain.Entities;

public class DirectMessage
{
    public Guid Id { get; set; }
    public Guid SenderId { get; set; }
    public Guid RecipientId { get; set; }
    public string Message { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public bool IsRead { get; set; }
    
    // Navigation properties
    public User Sender { get; set; } = null!;
    public User Recipient { get; set; } = null!;
}

