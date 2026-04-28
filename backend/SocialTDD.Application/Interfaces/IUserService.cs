using SocialTDD.Application.DTOs;

namespace SocialTDD.Application.Interfaces;

public interface IUserService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request);
    Task<AuthResponse> LoginAsync(LoginRequest request);
    Task<UserResponse?> GetUserByIdAsync(Guid userId);
    Task<UserResponse?> GetUserByUsernameAsync(string username);
    Task<List<UserResponse>> GetAllUsersAsync();
    Task<List<UserResponse>> SearchUsersAsync(string searchTerm);
}