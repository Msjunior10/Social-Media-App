namespace SocialTDD.Domain.Entities;

public class Follow
{
    public Guid Id { get; set; }
    public Guid FollowerId { get; set; }  // Den som följer
    public Guid FollowingId { get; set; }  // Den som följs
    public DateTime CreatedAt { get; set; }
    
    // Navigation properties
    public User Follower { get; set; } = null!;
    public User Following { get; set; } = null!;
}