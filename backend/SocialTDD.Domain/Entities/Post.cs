namespace SocialTDD.Domain.Entities;

public class Post
{
    public Guid Id { get; set; }
    public Guid SenderId { get; set; }
    public Guid RecipientId { get; set; }
    public Guid? OriginalPostId { get; set; }
    public string Message { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public DateTime CreatedAt { get; set; }
    
    // Navigation properties
    public User Sender { get; set; } = null!;
    public User Recipient { get; set; } = null!;
    public Post? OriginalPost { get; set; }

    public ICollection<PostLike> Likes { get; set; } = new List<PostLike>();
    public ICollection<PostComment> Comments { get; set; } = new List<PostComment>();
    public ICollection<PostBookmark> Bookmarks { get; set; } = new List<PostBookmark>();
    public ICollection<Post> Reposts { get; set; } = new List<Post>();
}



