namespace SocialTDD.Application.DTOs;

public class CreateConversationRequest
{
    public string Title { get; set; } = string.Empty;
    public List<Guid> MemberIds { get; set; } = new();
}
