namespace SocialTDD.Application.DTOs;

public class CreatePostRequest
{
    public Guid SenderId { get; set; }
    public Guid RecipientId { get; set; }
    public string Message { get; set; } = string.Empty;
}



