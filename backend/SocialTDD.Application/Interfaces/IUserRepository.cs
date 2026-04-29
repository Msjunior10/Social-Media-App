using SocialTDD.Domain.Entities;

namespace SocialTDD.Application.Interfaces;

public interface IUserRepository
{
    Task<User?> GetUserByUsernameAsync(string username);
    Task<User?> GetUserByEmailAsync(string email);
    Task<User> CreateUserAsync(User user, string passwordHash);
    Task<string?> GetUserPasswordHashAsync(Guid userId);
    Task<bool> UserExistsAsync(Guid userId);
    Task<User?> GetByIdAsync(Guid userId);
    Task<User> UpdateUserAsync(User user);
    Task UpdateLastActiveAsync(Guid userId, DateTime lastActiveAt);
    Task<IEnumerable<User>> GetAllUsersAsync();
    Task<IEnumerable<User>> SearchUsersAsync(string searchTerm);
}