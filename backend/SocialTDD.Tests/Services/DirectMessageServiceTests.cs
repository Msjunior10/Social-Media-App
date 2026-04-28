using FluentAssertions;
using FluentValidation;
using Moq;
using SocialTDD.Application.DTOs;
using SocialTDD.Application.Interfaces;
using SocialTDD.Application.Services;
using SocialTDD.Application.Validators;
using SocialTDD.Domain.Entities;

namespace SocialTDD.Tests.Services;

public class DirectMessageServiceTests
{
    private readonly Mock<IDirectMessageRepository> _mockRepository;
    private readonly IValidator<CreateDirectMessageRequest> _validator;
    private readonly DirectMessageService _directMessageService;

    public DirectMessageServiceTests()
    {
        _mockRepository = new Mock<IDirectMessageRepository>();
        _validator = new CreateDirectMessageRequestValidator();
        _directMessageService = new DirectMessageService(_mockRepository.Object, _validator);
    }

    [Fact]
    public async Task SendDirectMessageAsync_ValidInput_ReturnsDirectMessageResponse()
    {
        // Arrange
        var senderId = Guid.NewGuid();
        var recipientId = Guid.NewGuid();
        var request = new CreateDirectMessageRequest
        {
            SenderId = senderId,
            RecipientId = recipientId,
            Message = "Detta är ett testmeddelande"
        };

        var expectedMessage = new DirectMessage
        {
            Id = Guid.NewGuid(),
            SenderId = senderId,
            RecipientId = recipientId,
            Message = request.Message,
            CreatedAt = DateTime.UtcNow,
            IsRead = false
        };

        _mockRepository.Setup(r => r.UserExistsAsync(senderId)).ReturnsAsync(true);
        _mockRepository.Setup(r => r.UserExistsAsync(recipientId)).ReturnsAsync(true);
        _mockRepository.Setup(r => r.CreateAsync(It.IsAny<DirectMessage>())).ReturnsAsync(expectedMessage);

        // Act
        var result = await _directMessageService.SendDirectMessageAsync(request);

        // Assert
        result.Should().NotBeNull();
        result.SenderId.Should().Be(senderId);
        result.RecipientId.Should().Be(recipientId);
        result.Message.Should().Be(request.Message);
        result.Id.Should().Be(expectedMessage.Id);
        result.IsRead.Should().BeFalse();
        _mockRepository.Verify(r => r.CreateAsync(It.IsAny<DirectMessage>()), Times.Once);
    }

    [Fact]
    public async Task SendDirectMessageAsync_EmptyMessage_ThrowsValidationException()
    {
        // Arrange
        var request = new CreateDirectMessageRequest
        {
            SenderId = Guid.NewGuid(),
            RecipientId = Guid.NewGuid(),
            Message = string.Empty
        };

        // Act & Assert
        await Assert.ThrowsAsync<ValidationException>(() => _directMessageService.SendDirectMessageAsync(request));
        _mockRepository.Verify(r => r.CreateAsync(It.IsAny<DirectMessage>()), Times.Never);
    }

    [Fact]
    public async Task SendDirectMessageAsync_MessageTooLong_ThrowsValidationException()
    {
        // Arrange
        var request = new CreateDirectMessageRequest
        {
            SenderId = Guid.NewGuid(),
            RecipientId = Guid.NewGuid(),
            Message = new string('a', 501) // Över maxlängd på 500 tecken
        };

        // Act & Assert
        await Assert.ThrowsAsync<ValidationException>(() => _directMessageService.SendDirectMessageAsync(request));
        _mockRepository.Verify(r => r.CreateAsync(It.IsAny<DirectMessage>()), Times.Never);
    }

    [Fact]
    public async Task SendDirectMessageAsync_SenderAndRecipientSame_ThrowsArgumentException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new CreateDirectMessageRequest
        {
            SenderId = userId,
            RecipientId = userId,
            Message = "Testmeddelande"
        };

        _mockRepository.Setup(r => r.UserExistsAsync(userId)).ReturnsAsync(true);

        // Act & Assert
        var exception = await Assert.ThrowsAsync<ArgumentException>(() => _directMessageService.SendDirectMessageAsync(request));
        exception.Message.Should().Contain("kan inte skicka meddelande till dig själv");
        _mockRepository.Verify(r => r.CreateAsync(It.IsAny<DirectMessage>()), Times.Never);
    }

    [Fact]
    public async Task SendDirectMessageAsync_InvalidSender_ThrowsArgumentException()
    {
        // Arrange
        var senderId = Guid.NewGuid();
        var recipientId = Guid.NewGuid();
        var request = new CreateDirectMessageRequest
        {
            SenderId = senderId,
            RecipientId = recipientId,
            Message = "Testmeddelande"
        };

        _mockRepository.Setup(r => r.UserExistsAsync(senderId)).ReturnsAsync(false);

        // Act & Assert
        var exception = await Assert.ThrowsAsync<ArgumentException>(() => _directMessageService.SendDirectMessageAsync(request));
        exception.Message.Should().Contain("Avsändare");
        exception.Message.Should().Contain("finns inte");
        _mockRepository.Verify(r => r.CreateAsync(It.IsAny<DirectMessage>()), Times.Never);
    }

    [Fact]
    public async Task SendDirectMessageAsync_InvalidRecipient_ThrowsArgumentException()
    {
        // Arrange
        var senderId = Guid.NewGuid();
        var recipientId = Guid.NewGuid();
        var request = new CreateDirectMessageRequest
        {
            SenderId = senderId,
            RecipientId = recipientId,
            Message = "Testmeddelande"
        };

        _mockRepository.Setup(r => r.UserExistsAsync(senderId)).ReturnsAsync(true);
        _mockRepository.Setup(r => r.UserExistsAsync(recipientId)).ReturnsAsync(false);

        // Act & Assert
        var exception = await Assert.ThrowsAsync<ArgumentException>(() => _directMessageService.SendDirectMessageAsync(request));
        exception.Message.Should().Contain("Mottagare");
        exception.Message.Should().Contain("finns inte");
        _mockRepository.Verify(r => r.CreateAsync(It.IsAny<DirectMessage>()), Times.Never);
    }

    [Fact]
    public async Task GetReceivedMessagesAsync_ValidUser_ReturnsMessages()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var senderId = Guid.NewGuid();
        var now = DateTime.UtcNow;

        var messages = new List<DirectMessage>
        {
            new DirectMessage
            {
                Id = Guid.NewGuid(),
                SenderId = senderId,
                RecipientId = userId,
                Message = "Första meddelandet",
                CreatedAt = now.AddMinutes(-10),
                IsRead = false
            },
            new DirectMessage
            {
                Id = Guid.NewGuid(),
                SenderId = senderId,
                RecipientId = userId,
                Message = "Andra meddelandet",
                CreatedAt = now,
                IsRead = true
            }
        };

        _mockRepository.Setup(r => r.UserExistsAsync(userId)).ReturnsAsync(true);
        _mockRepository.Setup(r => r.GetByRecipientIdAsync(userId)).ReturnsAsync(messages);

        // Act
        var result = await _directMessageService.GetReceivedMessagesAsync(userId);

        // Assert
        result.Should().NotBeNull();
        result.Should().HaveCount(2);
        result[0].Message.Should().Be("Första meddelandet");
        result[1].Message.Should().Be("Andra meddelandet");
        _mockRepository.Verify(r => r.GetByRecipientIdAsync(userId), Times.Once);
    }

    [Fact]
    public async Task GetReceivedMessagesAsync_InvalidUser_ThrowsArgumentException()
    {
        // Arrange
        var userId = Guid.NewGuid();

        _mockRepository.Setup(r => r.UserExistsAsync(userId)).ReturnsAsync(false);

        // Act & Assert
        var exception = await Assert.ThrowsAsync<ArgumentException>(() => _directMessageService.GetReceivedMessagesAsync(userId));
        exception.Message.Should().Contain("finns inte");
        _mockRepository.Verify(r => r.GetByRecipientIdAsync(It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task GetReceivedMessagesAsync_EmptyList_ReturnsEmptyList()
    {
        // Arrange
        var userId = Guid.NewGuid();

        _mockRepository.Setup(r => r.UserExistsAsync(userId)).ReturnsAsync(true);
        _mockRepository.Setup(r => r.GetByRecipientIdAsync(userId)).ReturnsAsync(new List<DirectMessage>());

        // Act
        var result = await _directMessageService.GetReceivedMessagesAsync(userId);

        // Assert
        result.Should().NotBeNull();
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task MarkAsReadAsync_ValidMessage_MarksAsRead()
    {
        // Arrange
        var messageId = Guid.NewGuid();
        var message = new DirectMessage
        {
            Id = messageId,
            SenderId = Guid.NewGuid(),
            RecipientId = Guid.NewGuid(),
            Message = "Testmeddelande",
            CreatedAt = DateTime.UtcNow,
            IsRead = false
        };

        _mockRepository.Setup(r => r.GetByIdAsync(messageId)).ReturnsAsync(message);
        _mockRepository.Setup(r => r.UpdateAsync(It.IsAny<DirectMessage>())).Returns(Task.CompletedTask);

        // Act
        await _directMessageService.MarkAsReadAsync(messageId);

        // Assert
        _mockRepository.Verify(r => r.GetByIdAsync(messageId), Times.Once);
        _mockRepository.Verify(r => r.UpdateAsync(It.Is<DirectMessage>(m => m.IsRead == true)), Times.Once);
    }

    [Fact]
    public async Task MarkAsReadAsync_InvalidMessage_ThrowsArgumentException()
    {
        // Arrange
        var messageId = Guid.NewGuid();

        _mockRepository.Setup(r => r.GetByIdAsync(messageId)).ReturnsAsync((DirectMessage?)null);

        // Act & Assert
        var exception = await Assert.ThrowsAsync<ArgumentException>(() => _directMessageService.MarkAsReadAsync(messageId));
        exception.Message.Should().Contain("finns inte");
        _mockRepository.Verify(r => r.UpdateAsync(It.IsAny<DirectMessage>()), Times.Never);
    }

    [Fact]
    public async Task MarkAsReadAsync_AlreadyRead_DoesNotUpdate()
    {
        // Arrange
        var messageId = Guid.NewGuid();
        var message = new DirectMessage
        {
            Id = messageId,
            SenderId = Guid.NewGuid(),
            RecipientId = Guid.NewGuid(),
            Message = "Testmeddelande",
            CreatedAt = DateTime.UtcNow,
            IsRead = true
        };

        _mockRepository.Setup(r => r.GetByIdAsync(messageId)).ReturnsAsync(message);

        // Act
        await _directMessageService.MarkAsReadAsync(messageId);

        // Assert
        _mockRepository.Verify(r => r.GetByIdAsync(messageId), Times.Once);
        _mockRepository.Verify(r => r.UpdateAsync(It.IsAny<DirectMessage>()), Times.Never);
    }

    [Fact]
    public async Task SendDirectMessageAsync_MessageWithOnlyWhitespace_ThrowsValidationException()
    {
        // Arrange
        var request = new CreateDirectMessageRequest
        {
            SenderId = Guid.NewGuid(),
            RecipientId = Guid.NewGuid(),
            Message = "   " // Bara mellanslag
        };

        // Act & Assert
        await Assert.ThrowsAsync<ValidationException>(() => _directMessageService.SendDirectMessageAsync(request));
        _mockRepository.Verify(r => r.CreateAsync(It.IsAny<DirectMessage>()), Times.Never);
    }

    [Fact]
    public async Task SendDirectMessageAsync_NullMessage_ThrowsValidationException()
    {
        // Arrange
        var request = new CreateDirectMessageRequest
        {
            SenderId = Guid.NewGuid(),
            RecipientId = Guid.NewGuid(),
            Message = null!
        };

        // Act & Assert
        await Assert.ThrowsAsync<ValidationException>(() => _directMessageService.SendDirectMessageAsync(request));
        _mockRepository.Verify(r => r.CreateAsync(It.IsAny<DirectMessage>()), Times.Never);
    }

    [Fact]
    public async Task SendDirectMessageAsync_EmptySenderId_ThrowsArgumentException()
    {
        // Arrange
        var request = new CreateDirectMessageRequest
        {
            SenderId = Guid.Empty,
            RecipientId = Guid.NewGuid(),
            Message = "Testmeddelande"
        };

        _mockRepository.Setup(r => r.UserExistsAsync(Guid.Empty)).ReturnsAsync(false);

        // Act & Assert
        var exception = await Assert.ThrowsAsync<ArgumentException>(() => _directMessageService.SendDirectMessageAsync(request));
        exception.Message.Should().Contain("Avsändare");
        exception.Message.Should().Contain("finns inte");
        _mockRepository.Verify(r => r.CreateAsync(It.IsAny<DirectMessage>()), Times.Never);
    }

    [Fact]
    public async Task SendDirectMessageAsync_EmptyRecipientId_ThrowsValidationException()
    {
        // Arrange
        var request = new CreateDirectMessageRequest
        {
            SenderId = Guid.NewGuid(),
            RecipientId = Guid.Empty,
            Message = "Testmeddelande"
        };

        // Act & Assert
        await Assert.ThrowsAsync<ValidationException>(() => _directMessageService.SendDirectMessageAsync(request));
        _mockRepository.Verify(r => r.CreateAsync(It.IsAny<DirectMessage>()), Times.Never);
    }
}

