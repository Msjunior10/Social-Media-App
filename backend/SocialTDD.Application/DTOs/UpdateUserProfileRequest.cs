namespace SocialTDD.Application.DTOs;

public class UpdateUserProfileRequest
{
    public string Bio { get; set; } = string.Empty;
    public string? ProfileImageUrl { get; set; }
}
