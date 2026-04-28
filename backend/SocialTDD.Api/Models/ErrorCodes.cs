namespace SocialTDD.Api.Models;

public static class ErrorCodes
{
    // Validation errors (400)
    public const string VALIDATION_ERROR = "VALIDATION_ERROR";
    public const string INVALID_USER_ID = "INVALID_USER_ID";
    public const string INVALID_RECIPIENT_ID = "INVALID_RECIPIENT_ID";
    public const string MESSAGE_TOO_LONG = "MESSAGE_TOO_LONG";
    public const string MESSAGE_TOO_SHORT = "MESSAGE_TOO_SHORT";
    
    // Authentication errors (401)
    public const string UNAUTHORIZED = "UNAUTHORIZED";
    public const string TOKEN_EXPIRED = "TOKEN_EXPIRED";
    public const string INVALID_CREDENTIALS = "INVALID_CREDENTIALS";
    
    // Not found errors (404)
    public const string USER_NOT_FOUND = "USER_NOT_FOUND";
    public const string POST_NOT_FOUND = "POST_NOT_FOUND";
    public const string MESSAGE_NOT_FOUND = "MESSAGE_NOT_FOUND";
    
    // Conflict errors (409)
    public const string ALREADY_FOLLOWING = "ALREADY_FOLLOWING";
    public const string USER_ALREADY_EXISTS = "USER_ALREADY_EXISTS";
    
    // Server errors (500)
    public const string INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR";
    public const string DATABASE_ERROR = "DATABASE_ERROR";
}