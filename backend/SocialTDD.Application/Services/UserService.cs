using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using FluentValidation;
using Microsoft.IdentityModel.Tokens;
using SocialTDD.Application.Configuration;
using SocialTDD.Application.DTOs;
using SocialTDD.Application.Interfaces;
using SocialTDD.Domain.Entities;
using JwtRegisteredClaimNames = Microsoft.IdentityModel.JsonWebTokens.JwtRegisteredClaimNames;

namespace SocialTDD.Application.Services;

public class UserService : IUserService
{
    private readonly IUserRepository _userRepository;
    private readonly IValidator<RegisterRequest> _registerValidator;
    private readonly IValidator<LoginRequest> _loginValidator;
    private readonly JwtConfiguration _jwtConfig;

    public UserService(
        IUserRepository userRepository,
        IValidator<RegisterRequest> registerValidator,
        IValidator<LoginRequest> loginValidator,
        JwtConfiguration jwtConfig)
    {
        _userRepository = userRepository ?? throw new ArgumentNullException(nameof(userRepository));
        _registerValidator = registerValidator ?? throw new ArgumentNullException(nameof(registerValidator));
        _loginValidator = loginValidator ?? throw new ArgumentNullException(nameof(loginValidator));
        _jwtConfig = jwtConfig ?? throw new ArgumentNullException(nameof(jwtConfig));
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
    {
        // Validera input
        var validationResult = await _registerValidator.ValidateAsync(request);
        if (!validationResult.IsValid)
        {
            throw new ValidationException(validationResult.Errors);
        }

        // Kontrollera om användarnamn redan finns
        var existingUserByUsername = await _userRepository.GetUserByUsernameAsync(request.Username);
        if (existingUserByUsername != null)
        {
            throw new ArgumentException($"Användarnamn '{request.Username}' finns redan.", nameof(request.Username));
        }

        // Kontrollera om e-post redan finns (case-insensitive)
        var existingUserByEmail = await _userRepository.GetUserByEmailAsync(request.Email);
        if (existingUserByEmail != null)
        {
            throw new ArgumentException($"E-post '{request.Email}' finns redan.", nameof(request.Email));
        }

        // Hasha lösenord
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

        // Skapa användare
        var user = new User
        {
            Id = Guid.NewGuid(),
            Username = request.Username,
            Email = request.Email,
            PasswordHash = passwordHash,
            CreatedAt = DateTime.UtcNow
        };

        var createdUser = await _userRepository.CreateUserAsync(user, passwordHash);

        // Generera JWT token
        var token = GenerateJwtToken(createdUser);

        return new AuthResponse
        {
            UserId = createdUser.Id,
            Username = createdUser.Username,
            Email = createdUser.Email,
            Token = token
        };
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request)
    {
        // Validera input
        var validationResult = await _loginValidator.ValidateAsync(request);
        if (!validationResult.IsValid)
        {
            throw new ValidationException(validationResult.Errors);
        }

        // Hämta användare
        var user = await _userRepository.GetUserByUsernameAsync(request.Username);
        if (user == null)
        {
            throw new ArgumentException("Användarnamn eller lösenord är felaktigt.", nameof(request.Username));
        }

        // Hämta password hash
        var passwordHash = await _userRepository.GetUserPasswordHashAsync(user.Id);
        if (string.IsNullOrEmpty(passwordHash))
        {
            throw new ArgumentException("Lösenord är felaktigt.", nameof(request.Password));
        }

        // Verifiera lösenord
        if (!BCrypt.Net.BCrypt.Verify(request.Password, passwordHash))
        {
            throw new ArgumentException("Användarnamn eller lösenord är felaktigt.", nameof(request.Password));
        }

        // Generera JWT token
        var token = GenerateJwtToken(user);

        return new AuthResponse
        {
            UserId = user.Id,
            Username = user.Username,
            Email = user.Email,
            Token = token
        };
    }

    private string GenerateJwtToken(User user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtConfig.Secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Username),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var token = new JwtSecurityToken(
            issuer: _jwtConfig.Issuer,
            audience: _jwtConfig.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(_jwtConfig.ExpirationInMinutes),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public async Task<UserResponse?> GetUserByIdAsync(Guid userId)
    {
        var user = await _userRepository.GetByIdAsync(userId);
        if (user == null)
        {
            return null;
        }

        return new UserResponse
        {
            Id = user.Id,
            Username = user.Username,
            Email = user.Email,
            CreatedAt = user.CreatedAt
        };
    }

    public async Task<UserResponse?> GetUserByUsernameAsync(string username)
    {
        var user = await _userRepository.GetUserByUsernameAsync(username);
        if (user == null)
        {
            return null;
        }

        return new UserResponse
        {
            Id = user.Id,
            Username = user.Username,
            Email = user.Email,
            CreatedAt = user.CreatedAt
        };
    }

    public async Task<List<UserResponse>> GetAllUsersAsync()
    {
        var users = await _userRepository.GetAllUsersAsync();
        return users.Select(u => new UserResponse
        {
            Id = u.Id,
            Username = u.Username,
            Email = u.Email,
            CreatedAt = u.CreatedAt
        }).ToList();
    }

    public async Task<List<UserResponse>> SearchUsersAsync(string searchTerm)
    {
        var users = await _userRepository.SearchUsersAsync(searchTerm);
        return users.Select(u => new UserResponse
        {
            Id = u.Id,
            Username = u.Username,
            Email = u.Email,
            CreatedAt = u.CreatedAt
        }).ToList();
    }
}