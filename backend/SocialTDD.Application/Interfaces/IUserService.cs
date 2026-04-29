using SocialTDD.Application.DTOs;

namespace SocialTDD.Application.Interfaces;

public interface IUserService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request);
    Task<AuthResponse> LoginAsync(LoginRequest request);
    Task<UserResponse?> GetUserByIdAsync(Guid userId);
    Task<UserResponse?> GetUserByUsernameAsync(string username);
    Task<UserResponse?> GetCurrentUserAsync(Guid userId);
    Task<UserResponse> UpdateProfileAsync(Guid userId, UpdateUserProfileRequest request);
    Task<List<UserResponse>> GetAllUsersAsync();
    Task<List<UserResponse>> SearchUsersAsync(string searchTerm);
}