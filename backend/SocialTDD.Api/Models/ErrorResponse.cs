namespace SocialTDD.Api.Models;

public class ErrorResponse
{
    public string ErrorCode { get; set; }
    public string Message { get; set; }
    public Dictionary<string, object>? Details { get; set; }
    
    public ErrorResponse(string errorCode, string message, Dictionary<string, object>? details = null)
    {
        ErrorCode = errorCode;
        Message = message;
        Details = details;
    }
}