namespace SocialTDD.Application.DTOs;

public class ConversationResponse
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public bool IsGroup { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<ConversationMemberResponse> Members { get; set; } = new();
}

public class ConversationMemberResponse
{
    public Guid UserId { get; set; }
    public string Username { get; set; } = string.Empty;
    public DateTime JoinedAt { get; set; }
}
