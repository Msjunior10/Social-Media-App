using FluentAssertions;
using FluentValidation;
using Moq;
using SocialTDD.Application.DTOs;
using SocialTDD.Application.Interfaces;
using SocialTDD.Application.Services;
using SocialTDD.Application.Validators;
using SocialTDD.Domain.Entities;

namespace SocialTDD.Tests.Services;

public class PostServiceTests
{
    private readonly Mock<IPostRepository> _mockRepository;
    private readonly IValidator<CreatePostRequest> _validator;
    private readonly PostService _postService;

    public PostServiceTests()
    {
        _mockRepository = new Mock<IPostRepository>();
        _validator = new CreatePostRequestValidator();
        _postService = new PostService(_mockRepository.Object, _validator);
    }

    [Fact]
    public async Task CreatePostAsync_ValidInput_ReturnsPostResponse()
    {
        // Arrange
        var senderId = Guid.NewGuid();
        var recipientId = Guid.NewGuid();
        var request = new CreatePostRequest
        {
            SenderId = senderId,
            RecipientId = recipientId,
            Message = "Detta är ett testmeddelande"
        };

        var expectedPost = new Post
        {
            Id = Guid.NewGuid(),
            SenderId = senderId,
            RecipientId = recipientId,
            Message = request.Message,
            CreatedAt = DateTime.UtcNow
        };

        _mockRepository.Setup(r => r.UserExistsAsync(senderId)).ReturnsAsync(true);
        _mockRepository.Setup(r => r.UserExistsAsync(recipientId)).ReturnsAsync(true);
        _mockRepository.Setup(r => r.CreateAsync(It.IsAny<Post>())).ReturnsAsync(expectedPost);

        // Act
        var result = await _postService.CreatePostAsync(request);

        // Assert
        result.Should().NotBeNull();
        result.SenderId.Should().Be(senderId);
        result.RecipientId.Should().Be(recipientId);
        result.Message.Should().Be(request.Message);
        result.Id.Should().Be(expectedPost.Id);
        _mockRepository.Verify(r => r.CreateAsync(It.IsAny<Post>()), Times.Once);
    }

    [Fact]
    public async Task CreatePostAsync_EmptyMessage_ThrowsValidationException()
    {
        // Arrange
        var request = new CreatePostRequest
        {
            SenderId = Guid.NewGuid(),
            RecipientId = Guid.NewGuid(),
            Message = string.Empty
        };

        // Act & Assert
        await Assert.ThrowsAsync<ValidationException>(() => _postService.CreatePostAsync(request));
        _mockRepository.Verify(r => r.CreateAsync(It.IsAny<Post>()), Times.Never);
    }

    [Fact]
    public async Task CreatePostAsync_MessageTooLong_ThrowsValidationException()
    {
        // Arrange
        var request = new CreatePostRequest
        {
            SenderId = Guid.NewGuid(),
            RecipientId = Guid.NewGuid(),
            Message = new string('a', 501) // Över maxlängd på 500 tecken
        };

        // Act & Assert
        await Assert.ThrowsAsync<ValidationException>(() => _postService.CreatePostAsync(request));
        _mockRepository.Verify(r => r.CreateAsync(It.IsAny<Post>()), Times.Never);
    }

    [Fact]
    public async Task CreatePostAsync_SenderAndRecipientSame_ThrowsArgumentException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new CreatePostRequest
        {
            SenderId = userId,
            RecipientId = userId,
            Message = "Testmeddelande"
        };

        _mockRepository.Setup(r => r.UserExistsAsync(userId)).ReturnsAsync(true);

        // Act & Assert
        var exception = await Assert.ThrowsAsync<ArgumentException>(() => _postService.CreatePostAsync(request));
        exception.Message.Should().Contain("Avsändare och mottagare kan inte vara samma");
        _mockRepository.Verify(r => r.CreateAsync(It.IsAny<Post>()), Times.Never);
    }

    [Fact]
    public async Task CreatePostAsync_InvalidSender_ThrowsArgumentException()
    {
        // Arrange
        var senderId = Guid.NewGuid();
        var recipientId = Guid.NewGuid();
        var request = new CreatePostRequest
        {
            SenderId = senderId,
            RecipientId = recipientId,
            Message = "Testmeddelande"
        };

        _mockRepository.Setup(r => r.UserExistsAsync(senderId)).ReturnsAsync(false);

        // Act & Assert
        var exception = await Assert.ThrowsAsync<ArgumentException>(() => _postService.CreatePostAsync(request));
        exception.Message.Should().Contain("Avsändare");
        exception.Message.Should().Contain("finns inte");
        _mockRepository.Verify(r => r.CreateAsync(It.IsAny<Post>()), Times.Never);
    }

    [Fact]
    public async Task CreatePostAsync_InvalidRecipient_ThrowsArgumentException()
    {
        // Arrange
        var senderId = Guid.NewGuid();
        var recipientId = Guid.NewGuid();
        var request = new CreatePostRequest
        {
            SenderId = senderId,
            RecipientId = recipientId,
            Message = "Testmeddelande"
        };

        _mockRepository.Setup(r => r.UserExistsAsync(senderId)).ReturnsAsync(true);
        _mockRepository.Setup(r => r.UserExistsAsync(recipientId)).ReturnsAsync(false);

        // Act & Assert
        var exception = await Assert.ThrowsAsync<ArgumentException>(() => _postService.CreatePostAsync(request));
        exception.Message.Should().Contain("Mottagare");
        exception.Message.Should().Contain("finns inte");
        _mockRepository.Verify(r => r.CreateAsync(It.IsAny<Post>()), Times.Never);
    }

    [Fact]
    public async Task CreatePostAsync_EmptySenderId_ThrowsArgumentException()
    {
        // Arrange
        var request = new CreatePostRequest
        {
            SenderId = Guid.Empty,
            RecipientId = Guid.NewGuid(),
            Message = "Testmeddelande"
        };

        _mockRepository.Setup(r => r.UserExistsAsync(Guid.Empty)).ReturnsAsync(false);

        // Act & Assert
        var exception = await Assert.ThrowsAsync<ArgumentException>(() => _postService.CreatePostAsync(request));
        exception.Message.Should().Contain("Avsändare");
        exception.Message.Should().Contain("finns inte");
        _mockRepository.Verify(r => r.CreateAsync(It.IsAny<Post>()), Times.Never);
    }

    [Fact]
    public async Task CreatePostAsync_EmptyRecipientId_ThrowsValidationException()
    {
        // Arrange
        var request = new CreatePostRequest
        {
            SenderId = Guid.NewGuid(),
            RecipientId = Guid.Empty,
            Message = "Testmeddelande"
        };

        // Act & Assert
        await Assert.ThrowsAsync<ValidationException>(() => _postService.CreatePostAsync(request));
        _mockRepository.Verify(r => r.CreateAsync(It.IsAny<Post>()), Times.Never);
    }

    [Fact]
    public async Task CreatePostAsync_MessageWithOnlyWhitespace_ThrowsValidationException()
    {
        // Arrange
        var request = new CreatePostRequest
        {
            SenderId = Guid.NewGuid(),
            RecipientId = Guid.NewGuid(),
            Message = "   " // Bara mellanslag
        };

        // Act & Assert
        await Assert.ThrowsAsync<ValidationException>(() => _postService.CreatePostAsync(request));
        _mockRepository.Verify(r => r.CreateAsync(It.IsAny<Post>()), Times.Never);
    }

    [Fact]
    public async Task CreatePostAsync_NullMessage_ThrowsValidationException()
    {
        // Arrange
        var request = new CreatePostRequest
        {
            SenderId = Guid.NewGuid(),
            RecipientId = Guid.NewGuid(),
            Message = null!
        };

        // Act & Assert
        await Assert.ThrowsAsync<ValidationException>(() => _postService.CreatePostAsync(request));
        _mockRepository.Verify(r => r.CreateAsync(It.IsAny<Post>()), Times.Never);
    }
}




