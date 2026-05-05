namespace SocialTDD.Application.DTOs;

public class PostResponse
{
    public Guid Id { get; set; }
    public Guid SenderId { get; set; }
    public Guid RecipientId { get; set; }
    public string Message { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public DateTime CreatedAt { get; set; }
    public Guid TargetPostId { get; set; }
    public int LikeCount { get; set; }
    public int RepostCount { get; set; }
    public bool IsLikedByCurrentUser { get; set; }
    public bool IsBookmarkedByCurrentUser { get; set; }
    public bool IsRepostedByCurrentUser { get; set; }
    public bool IsRepost { get; set; }
    public Guid? OriginalPostId { get; set; }
    public Guid? OriginalSenderId { get; set; }
    public string? OriginalMessage { get; set; }
    public string? OriginalImageUrl { get; set; }
    public DateTime? OriginalCreatedAt { get; set; }
    public List<PostCommentResponse> Comments { get; set; } = new();
}



