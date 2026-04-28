namespace SocialTDD.Application.DTOs;

public class CreateDirectMessageRequest
{
    public Guid SenderId { get; set; }
    public Guid RecipientId { get; set; }
    public string Message { get; set; } = string.Empty;
}

