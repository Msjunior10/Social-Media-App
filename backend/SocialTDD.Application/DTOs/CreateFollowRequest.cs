namespace SocialTDD.Application.DTOs;

public class CreateFollowRequest
{
    public Guid FollowerId { get; set; }
    public Guid FollowingId { get; set; }
}