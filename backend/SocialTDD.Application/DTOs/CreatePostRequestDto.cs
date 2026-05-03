namespace SocialTDD.Application.DTOs;

/// <summary>
/// DTO för att ta emot post-request från frontend (utan SenderId som sätts från token)
/// </summary>
public class CreatePostRequestDto
{
    public string Message { get; set; } = string.Empty;
}
