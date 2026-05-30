using FluentAssertions;
using Moq;
using SocialTDD.Application.Interfaces;
using SocialTDD.Application.Services;
using SocialTDD.Domain.Entities;

namespace SocialTDD.Tests.Services;

public class NotificationServiceTests
{
    private readonly Mock<INotificationRepository> _notificationRepository;
    private readonly NotificationService _notificationService;

    public NotificationServiceTests()
    {
        _notificationRepository = new Mock<INotificationRepository>();
        _notificationService = new NotificationService(_notificationRepository.Object);
    }

    [Fact]
    public async Task CreateCallStartedNotificationAsync_SetsConversationId()
    {
        var recipientUserId = Guid.NewGuid();
        var actorUserId = Guid.NewGuid();
        var conversationId = Guid.NewGuid();
        var notificationId = Guid.NewGuid();

        _notificationRepository.Setup(repository => repository.UserExistsAsync(recipientUserId)).ReturnsAsync(true);
        _notificationRepository.Setup(repository => repository.UserExistsAsync(actorUserId)).ReturnsAsync(true);
        _notificationRepository.Setup(repository => repository.CreateAsync(It.IsAny<Notification>()))
            .ReturnsAsync((Notification notification) => notification);
        _notificationRepository.Setup(repository => repository.GetByIdAsync(It.IsAny<Guid>()))
            .ReturnsAsync((Guid id) => new Notification
            {
                Id = notificationId,
                UserId = recipientUserId,
                ActorId = actorUserId,
                Type = "call_started",
                ConversationId = conversationId,
                CreatedAt = DateTime.UtcNow,
                IsRead = false,
                Actor = new User { Username = "Boz" }
            });
        _notificationRepository.Setup(repository => repository.GetUnreadCountAsync(recipientUserId)).ReturnsAsync(1);

        await _notificationService.CreateCallStartedNotificationAsync(recipientUserId, actorUserId, conversationId);

        _notificationRepository.Verify(repository => repository.CreateAsync(It.Is<Notification>(notification =>
            notification.UserId == recipientUserId &&
            notification.ActorId == actorUserId &&
            notification.Type == "call_started" &&
            notification.ConversationId == conversationId)), Times.Once);
    }
}