namespace SocialTDD.Application.DTOs;

public class NotificationResponse
{
    public Guid Id { get; set; }
    public string Type { get; set; } = string.Empty;
    public Guid UserId { get; set; }
    public Guid ActorId { get; set; }
    public string ActorUsername { get; set; } = string.Empty;
    public Guid? PostId { get; set; }
    public Guid? DirectMessageId { get; set; }
    public string Message { get; set; } = string.Empty;
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; }
}
