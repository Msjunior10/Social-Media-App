namespace SocialTDD.Domain.Entities;

public class Notification
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid ActorId { get; set; }
    public string Type { get; set; } = string.Empty;
    public Guid? PostId { get; set; }
    public Guid? DirectMessageId { get; set; }
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; }

    public User User { get; set; } = null!;
    public User Actor { get; set; } = null!;
}
