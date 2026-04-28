export class ApiError extends Error {
    constructor(errorCode, message, statusCode, details = null) {
      super(message);
      this.name = 'ApiError';
      this.errorCode = errorCode;
      this.statusCode = statusCode;
      this.details = details;
    }
  }
  
  export const ErrorCodes = {
    // Validation errors (400)
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    INVALID_USER_ID: 'INVALID_USER_ID',
    INVALID_RECIPIENT_ID: 'INVALID_RECIPIENT_ID',
    MESSAGE_TOO_LONG: 'MESSAGE_TOO_LONG',
    MESSAGE_TOO_SHORT: 'MESSAGE_TOO_SHORT',
    
    // Authentication errors (401)
    UNAUTHORIZED: 'UNAUTHORIZED',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    
    // Not found errors (404)
    USER_NOT_FOUND: 'USER_NOT_FOUND',
    POST_NOT_FOUND: 'POST_NOT_FOUND',
    MESSAGE_NOT_FOUND: 'MESSAGE_NOT_FOUND',
    
    // Conflict errors (409)
    ALREADY_FOLLOWING: 'ALREADY_FOLLOWING',
    USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
    
    // Server errors (500)
    INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
    DATABASE_ERROR: 'DATABASE_ERROR',
    
    // Network errors
    NETWORK_ERROR: 'NETWORK_ERROR',
    TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  };