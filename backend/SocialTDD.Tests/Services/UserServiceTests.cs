using FluentAssertions;
using FluentValidation;
using Moq;
using SocialTDD.Application.Configuration;
using SocialTDD.Application.DTOs;
using SocialTDD.Application.Interfaces;
using SocialTDD.Application.Services;
using SocialTDD.Application.Validators;
using SocialTDD.Domain.Entities;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace SocialTDD.Tests.Services;

public class UserServiceTests
{
    private readonly Mock<IUserRepository> _mockRepository;
    private readonly IValidator<RegisterRequest> _registerValidator;
    private readonly IValidator<LoginRequest> _loginValidator;
    private readonly UserService _userService;
    private readonly string _testJwtSecret = "TestSecretKeyThatIsAtLeast32CharactersLong!";
    private readonly string _testIssuer = "TestIssuer";
    private readonly string _testAudience = "TestAudience";

    public UserServiceTests()
    {
        _mockRepository = new Mock<IUserRepository>();
        _registerValidator = new RegisterRequestValidator();
        _loginValidator = new LoginRequestValidator();
        
        var jwtConfig = new JwtConfiguration
        {
            Secret = _testJwtSecret,
            Issuer = _testIssuer,
            Audience = _testAudience,
            ExpirationInMinutes = 60
        };
        
        _userService = new UserService(_mockRepository.Object, _registerValidator, _loginValidator, jwtConfig);
    }

    #region RegisterAsync Tests

    [Fact]
    public async Task RegisterAsync_ValidInput_ReturnsAuthResponse()
    {
        // Arrange
        var request = new RegisterRequest
        {
            Username = "testuser",
            Email = "test@example.com",
            Password = "SecurePassword123!"
        };

        var userId = Guid.NewGuid();
        var expectedUser = new User
        {
            Id = userId,
            Username = request.Username,
            Email = request.Email,
            CreatedAt = DateTime.UtcNow
        };

        _mockRepository.Setup(r => r.GetUserByUsernameAsync(request.Username)).ReturnsAsync((User?)null);
        _mockRepository.Setup(r => r.GetUserByEmailAsync(request.Email)).ReturnsAsync((User?)null);
        _mockRepository.Setup(r => r.CreateUserAsync(It.IsAny<User>(), It.IsAny<string>()))
            .ReturnsAsync(expectedUser);

        // Act
        var result = await _userService.RegisterAsync(request);

        // Assert
        result.Should().NotBeNull();
        result.UserId.Should().Be(userId);
        result.Username.Should().Be(request.Username);
        result.Token.Should().NotBeNullOrEmpty();
        
        _mockRepository.Verify(r => r.CreateUserAsync(
            It.Is<User>(u => u.Username == request.Username && u.Email == request.Email),
            It.Is<string>(p => p != request.Password && p.StartsWith("$2"))), // Password ska vara BCrypt hash
            Times.Once);
    }

    [Fact]
    public async Task RegisterAsync_DuplicateUsername_ThrowsArgumentException()
    {
        // Arrange
        var request = new RegisterRequest
        {
            Username = "existinguser",
            Email = "new@example.com",
            Password = "Password123!"
        };

        var existingUser = new User
        {
            Id = Guid.NewGuid(),
            Username = "existinguser",
            Email = "old@example.com"
        };

        _mockRepository.Setup(r => r.GetUserByUsernameAsync(request.Username)).ReturnsAsync(existingUser);

        // Act & Assert
        var exception = await Assert.ThrowsAsync<ArgumentException>(
            () => _userService.RegisterAsync(request));
        
        exception.Message.Should().ContainEquivalentOf("användarnamn");
        exception.Message.Should().Contain("finns redan");
        _mockRepository.Verify(r => r.CreateUserAsync(It.IsAny<User>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task RegisterAsync_DuplicateEmail_ThrowsArgumentException()
    {
        // Arrange
        var request = new RegisterRequest
        {
            Username = "newuser",
            Email = "existing@example.com",
            Password = "Password123!"
        };

        var existingUser = new User
        {
            Id = Guid.NewGuid(),
            Username = "olduser",
            Email = "existing@example.com"
        };

        _mockRepository.Setup(r => r.GetUserByUsernameAsync(request.Username)).ReturnsAsync((User?)null);
        _mockRepository.Setup(r => r.GetUserByEmailAsync(request.Email)).ReturnsAsync(existingUser);

        // Act & Assert
        var exception = await Assert.ThrowsAsync<ArgumentException>(
            () => _userService.RegisterAsync(request));
        
        exception.Message.Should().ContainEquivalentOf("e-post");
        exception.Message.Should().Contain("finns redan");
        _mockRepository.Verify(r => r.CreateUserAsync(It.IsAny<User>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task RegisterAsync_InvalidEmail_ThrowsValidationException()
    {
        // Arrange
        var request = new RegisterRequest
        {
            Username = "testuser",
            Email = "invalid-email",
            Password = "Password123!"
        };

        // Act & Assert
        await Assert.ThrowsAsync<ValidationException>(
            () => _userService.RegisterAsync(request));
        
        _mockRepository.Verify(r => r.CreateUserAsync(It.IsAny<User>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task RegisterAsync_WeakPassword_ThrowsValidationException()
    {
        // Arrange
        var request = new RegisterRequest
        {
            Username = "testuser",
            Email = "test@example.com",
            Password = "123" // För kort lösenord
        };

        // Act & Assert
        await Assert.ThrowsAsync<ValidationException>(
            () => _userService.RegisterAsync(request));
        
        _mockRepository.Verify(r => r.CreateUserAsync(It.IsAny<User>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task RegisterAsync_EmptyUsername_ThrowsValidationException()
    {
        // Arrange
        var request = new RegisterRequest
        {
            Username = string.Empty,
            Email = "test@example.com",
            Password = "Password123!"
        };

        // Act & Assert
        await Assert.ThrowsAsync<ValidationException>(
            () => _userService.RegisterAsync(request));
        
        _mockRepository.Verify(r => r.CreateUserAsync(It.IsAny<User>(), It.IsAny<string>()), Times.Never);
    }

    #endregion

    #region LoginAsync Tests

    [Fact]
    public async Task LoginAsync_ValidCredentials_ReturnsAuthResponse()
    {
        // Arrange
        var username = "testuser";
        var password = "SecurePassword123!";
        var userId = Guid.NewGuid();
        
        var request = new LoginRequest
        {
            Username = username,
            Password = password
        };

        var user = new User
        {
            Id = userId,
            Username = username,
            Email = "test@example.com",
            CreatedAt = DateTime.UtcNow
        };

        var hashedPassword = BCrypt.Net.BCrypt.HashPassword(password);
        
        _mockRepository.Setup(r => r.GetUserByUsernameAsync(username)).ReturnsAsync(user);
        _mockRepository.Setup(r => r.GetUserPasswordHashAsync(userId)).ReturnsAsync(hashedPassword);

        // Act
        var result = await _userService.LoginAsync(request);

        // Assert
        result.Should().NotBeNull();
        result.UserId.Should().Be(userId);
        result.Username.Should().Be(username);
        result.Token.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task LoginAsync_InvalidUsername_ThrowsArgumentException()
    {
        // Arrange
        var request = new LoginRequest
        {
            Username = "nonexistent",
            Password = "Password123!"
        };

        _mockRepository.Setup(r => r.GetUserByUsernameAsync(request.Username)).ReturnsAsync((User?)null);

        // Act & Assert
        var exception = await Assert.ThrowsAsync<ArgumentException>(
            () => _userService.LoginAsync(request));
        
        exception.Message.Should().ContainEquivalentOf("användarnamn");
        exception.Message.Should().Contain("felaktigt");
    }

    [Fact]
    public async Task LoginAsync_InvalidPassword_ThrowsArgumentException()
    {
        // Arrange
        var username = "testuser";
        var userId = Guid.NewGuid();
        
        var request = new LoginRequest
        {
            Username = username,
            Password = "WrongPassword123!"
        };

        var user = new User
        {
            Id = userId,
            Username = username,
            Email = "test@example.com"
        };

        var correctPassword = "SecurePassword123!";
        var hashedPassword = BCrypt.Net.BCrypt.HashPassword(correctPassword);
        
        _mockRepository.Setup(r => r.GetUserByUsernameAsync(username)).ReturnsAsync(user);
        _mockRepository.Setup(r => r.GetUserPasswordHashAsync(userId)).ReturnsAsync(hashedPassword);

        // Act & Assert
        var exception = await Assert.ThrowsAsync<ArgumentException>(
            () => _userService.LoginAsync(request));
        
        exception.Message.Should().ContainEquivalentOf("användarnamn");
        exception.Message.Should().Contain("felaktigt");
    }

    [Fact]
    public async Task LoginAsync_EmptyUsername_ThrowsValidationException()
    {
        // Arrange
        var request = new LoginRequest
        {
            Username = string.Empty,
            Password = "Password123!"
        };

        // Act & Assert
        await Assert.ThrowsAsync<ValidationException>(
            () => _userService.LoginAsync(request));
    }

    [Fact]
    public async Task LoginAsync_EmptyPassword_ThrowsValidationException()
    {
        // Arrange
        var request = new LoginRequest
        {
            Username = "testuser",
            Password = string.Empty
        };

        // Act & Assert
        await Assert.ThrowsAsync<ValidationException>(
            () => _userService.LoginAsync(request));
    }

    #endregion

    #region Password Hashing Tests

    [Fact]
    public async Task RegisterAsync_PasswordIsHashed_DoesNotStorePlainText()
    {
        // Arrange
        var request = new RegisterRequest
        {
            Username = "testuser",
            Email = "test@example.com",
            Password = "PlainTextPassword123!"
        };

        var userId = Guid.NewGuid();
        string? storedPasswordHash = null;

        _mockRepository.Setup(r => r.GetUserByUsernameAsync(request.Username)).ReturnsAsync((User?)null);
        _mockRepository.Setup(r => r.GetUserByEmailAsync(request.Email)).ReturnsAsync((User?)null);
        _mockRepository.Setup(r => r.CreateUserAsync(It.IsAny<User>(), It.IsAny<string>()))
            .Callback<User, string>((user, passwordHash) => storedPasswordHash = passwordHash)
            .ReturnsAsync(new User { Id = userId, Username = request.Username, Email = request.Email });

        // Act
        await _userService.RegisterAsync(request);

        // Assert
        storedPasswordHash.Should().NotBeNull();
        storedPasswordHash.Should().NotBe(request.Password);
        storedPasswordHash.Should().StartWith("$2"); // BCrypt hash börjar med $2
    }

    [Fact]
    public async Task LoginAsync_VerifiesPasswordHash_Correctly()
    {
        // Arrange
        var username = "testuser";
        var password = "SecurePassword123!";
        var userId = Guid.NewGuid();
        
        var request = new LoginRequest
        {
            Username = username,
            Password = password
        };

        var user = new User
        {
            Id = userId,
            Username = username,
            Email = "test@example.com"
        };

        var hashedPassword = BCrypt.Net.BCrypt.HashPassword(password);
        
        _mockRepository.Setup(r => r.GetUserByUsernameAsync(username)).ReturnsAsync(user);
        _mockRepository.Setup(r => r.GetUserPasswordHashAsync(userId)).ReturnsAsync(hashedPassword);

        // Act
        var result = await _userService.LoginAsync(request);

        // Assert
        result.Should().NotBeNull();
        result.Username.Should().Be(username);
    }

    #endregion

    #region JWT Token Generation Tests

    [Fact]
    public async Task RegisterAsync_ReturnsValidJwtToken()
    {
        // Arrange
        var request = new RegisterRequest
        {
            Username = "testuser",
            Email = "test@example.com",
            Password = "Password123!"
        };

        var userId = Guid.NewGuid();

        _mockRepository.Setup(r => r.GetUserByUsernameAsync(request.Username)).ReturnsAsync((User?)null);
        _mockRepository.Setup(r => r.GetUserByEmailAsync(request.Email)).ReturnsAsync((User?)null);
        _mockRepository.Setup(r => r.CreateUserAsync(It.IsAny<User>(), It.IsAny<string>()))
            .ReturnsAsync(new User { Id = userId, Username = request.Username, Email = request.Email });

        // Act
        var result = await _userService.RegisterAsync(request);

        // Assert
        result.Token.Should().NotBeNullOrEmpty();
        
        var handler = new JwtSecurityTokenHandler();
        var token = handler.ReadJwtToken(result.Token);
        
        token.Should().NotBeNull();
        token.Claims.Should().Contain(c => c.Type == ClaimTypes.NameIdentifier && c.Value == userId.ToString());
        token.Claims.Should().Contain(c => c.Type == ClaimTypes.Name && c.Value == request.Username);
    }

    [Fact]
    public async Task LoginAsync_ReturnsValidJwtToken()
    {
        // Arrange
        var username = "testuser";
        var password = "SecurePassword123!";
        var userId = Guid.NewGuid();
        
        var request = new LoginRequest
        {
            Username = username,
            Password = password
        };

        var user = new User
        {
            Id = userId,
            Username = username,
            Email = "test@example.com"
        };

        var hashedPassword = BCrypt.Net.BCrypt.HashPassword(password);
        
        _mockRepository.Setup(r => r.GetUserByUsernameAsync(username)).ReturnsAsync(user);
        _mockRepository.Setup(r => r.GetUserPasswordHashAsync(userId)).ReturnsAsync(hashedPassword);

        // Act
        var result = await _userService.LoginAsync(request);

        // Assert
        result.Token.Should().NotBeNullOrEmpty();
        
        var handler = new JwtSecurityTokenHandler();
        var token = handler.ReadJwtToken(result.Token);
        
        token.Should().NotBeNull();
        token.Claims.Should().Contain(c => c.Type == ClaimTypes.NameIdentifier && c.Value == userId.ToString());
        token.Claims.Should().Contain(c => c.Type == ClaimTypes.Name && c.Value == username);
    }

    [Fact]
    public async Task RegisterAsync_TokenContainsCorrectClaims()
    {
        // Arrange
        var request = new RegisterRequest
        {
            Username = "testuser",
            Email = "test@example.com",
            Password = "Password123!"
        };

        var userId = Guid.NewGuid();

        _mockRepository.Setup(r => r.GetUserByUsernameAsync(request.Username)).ReturnsAsync((User?)null);
        _mockRepository.Setup(r => r.GetUserByEmailAsync(request.Email)).ReturnsAsync((User?)null);
        _mockRepository.Setup(r => r.CreateUserAsync(It.IsAny<User>(), It.IsAny<string>()))
            .ReturnsAsync(new User { Id = userId, Username = request.Username, Email = request.Email });

        // Act
        var result = await _userService.RegisterAsync(request);

        // Assert
        var handler = new JwtSecurityTokenHandler();
        var token = handler.ReadJwtToken(result.Token);
        
        token.Claims.Should().Contain(c => c.Type == ClaimTypes.NameIdentifier);
        token.Claims.Should().Contain(c => c.Type == ClaimTypes.Name);
        token.Claims.Should().Contain(c => c.Type == ClaimTypes.Email);
    }

    #endregion

    #region Edge Cases Tests

    [Fact]
    public async Task RegisterAsync_UsernameWithSpecialCharacters_ThrowsValidationException()
    {
        // Arrange
        var request = new RegisterRequest
        {
            Username = "user@#$%",
            Email = "test@example.com",
            Password = "Password123!"
        };

        // Act & Assert
        await Assert.ThrowsAsync<ValidationException>(
            () => _userService.RegisterAsync(request));
    }

    [Fact]
    public async Task RegisterAsync_EmailAlreadyExistsCaseInsensitive_ThrowsArgumentException()
    {
        // Arrange
        var request = new RegisterRequest
        {
            Username = "newuser",
            Email = "TEST@EXAMPLE.COM",
            Password = "Password123!"
        };

        var existingUser = new User
        {
            Id = Guid.NewGuid(),
            Username = "olduser",
            Email = "test@example.com"
        };

        _mockRepository.Setup(r => r.GetUserByUsernameAsync(request.Username)).ReturnsAsync((User?)null);
        _mockRepository.Setup(r => r.GetUserByEmailAsync(It.Is<string>(e => e.Equals("test@example.com", StringComparison.OrdinalIgnoreCase))))
            .ReturnsAsync(existingUser);

        // Act & Assert
        var exception = await Assert.ThrowsAsync<ArgumentException>(
            () => _userService.RegisterAsync(request));
        
        exception.Message.Should().ContainEquivalentOf("e-post");
    }

    [Fact]
    public async Task LoginAsync_UserNotFound_ThrowsArgumentException()
    {
        // Arrange
        var request = new LoginRequest
        {
            Username = "nonexistentuser",
            Password = "AnyPassword123!"
        };

        _mockRepository.Setup(r => r.GetUserByUsernameAsync(request.Username)).ReturnsAsync((User?)null);

        // Act & Assert
        var exception = await Assert.ThrowsAsync<ArgumentException>(
            () => _userService.LoginAsync(request));
        
        exception.Message.Should().ContainEquivalentOf("användarnamn");
        exception.Message.Should().Contain("felaktigt");
    }

    [Fact]
    public async Task LoginAsync_PasswordHashNotFound_ThrowsArgumentException()
    {
        // Arrange
        var username = "testuser";
        var userId = Guid.NewGuid();
        
        var request = new LoginRequest
        {
            Username = username,
            Password = "Password123!"
        };

        var user = new User
        {
            Id = userId,
            Username = username,
            Email = "test@example.com"
        };

        _mockRepository.Setup(r => r.GetUserByUsernameAsync(username)).ReturnsAsync(user);
        _mockRepository.Setup(r => r.GetUserPasswordHashAsync(userId)).ReturnsAsync((string?)null);

        // Act & Assert
        var exception = await Assert.ThrowsAsync<ArgumentException>(
            () => _userService.LoginAsync(request));
        
        exception.Message.Should().ContainEquivalentOf("lösenord");
    }

    #endregion
}