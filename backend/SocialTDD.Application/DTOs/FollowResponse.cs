namespace SocialTDD.Application.DTOs;

public class FollowResponse
{
    public Guid Id { get; set; }
    public Guid FollowerId { get; set; }
    public Guid FollowingId { get; set; }
    public DateTime CreatedAt { get; set; }
}