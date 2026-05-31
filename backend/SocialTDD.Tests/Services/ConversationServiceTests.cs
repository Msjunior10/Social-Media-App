using FluentAssertions;
using Moq;
using SocialTDD.Application.DTOs;
using SocialTDD.Application.Interfaces;
using SocialTDD.Application.Services;
using SocialTDD.Domain.Entities;

namespace SocialTDD.Tests.Services;

public class ConversationServiceTests
{
    private readonly Mock<IConversationRepository> _conversationRepository;
    private readonly Mock<INotificationService> _notificationService;
    private readonly ConversationService _conversationService;

    public ConversationServiceTests()
    {
        _conversationRepository = new Mock<IConversationRepository>();
        _notificationService = new Mock<INotificationService>();
        _conversationService = new ConversationService(_conversationRepository.Object, _notificationService.Object);
    }

    [Fact]
    public async Task CreateGroupConversationAsync_NotifiesOtherMembers_AndIncludesCurrentUserOnce()
    {
        var currentUserId = Guid.NewGuid();
        var secondMemberId = Guid.NewGuid();
        var thirdMemberId = Guid.NewGuid();

        var request = new CreateConversationRequest
        {
            Title = "  Testgrupp  ",
            MemberIds = new List<Guid> { secondMemberId, thirdMemberId, currentUserId, secondMemberId }
        };

        _conversationRepository.Setup(r => r.UserExistsAsync(currentUserId)).ReturnsAsync(true);
        _conversationRepository.Setup(r => r.UserExistsAsync(secondMemberId)).ReturnsAsync(true);
        _conversationRepository.Setup(r => r.UserExistsAsync(thirdMemberId)).ReturnsAsync(true);
        _conversationRepository
            .Setup(r => r.CreateConversationAsync(It.IsAny<Conversation>()))
            .ReturnsAsync((Conversation conversation) => conversation);
        _conversationRepository
            .Setup(r => r.GetConversationByIdAsync(It.IsAny<Guid>()))
            .ReturnsAsync((Conversation?)null);

        var result = await _conversationService.CreateGroupConversationAsync(currentUserId, request);

        result.Title.Should().Be("Testgrupp");
        result.IsGroup.Should().BeTrue();
        result.Members.Should().HaveCount(3);
        result.Members.Select(member => member.UserId).Should().OnlyHaveUniqueItems();
        result.Members.Select(member => member.UserId).Should().Contain(new[] { currentUserId, secondMemberId, thirdMemberId });

        _notificationService.Verify(service => service.CreateGroupConversationNotificationAsync(secondMemberId, currentUserId), Times.Once);
        _notificationService.Verify(service => service.CreateGroupConversationNotificationAsync(thirdMemberId, currentUserId), Times.Once);
        _notificationService.Verify(service => service.CreateGroupConversationNotificationAsync(currentUserId, currentUserId), Times.Never);
    }

    [Fact]
    public async Task CreateGroupConversationAsync_Throws_WhenOnlyCurrentUserRemainsAfterDistinct()
    {
        var currentUserId = Guid.NewGuid();
        var request = new CreateConversationRequest
        {
            Title = "Solo group",
            MemberIds = new List<Guid> { currentUserId, Guid.Empty }
        };

        Func<Task> action = async () => await _conversationService.CreateGroupConversationAsync(currentUserId, request);

        await action.Should().ThrowAsync<ArgumentException>()
            .WithMessage("En gruppkonversation måste innehålla minst två medlemmar.*");
    }

    [Fact]
    public async Task SendMessageAsync_GroupConversation_NotifiesAllOtherMembers()
    {
        var currentUserId = Guid.NewGuid();
        var secondMemberId = Guid.NewGuid();
        var thirdMemberId = Guid.NewGuid();
        var conversationId = Guid.NewGuid();

        var conversation = new Conversation
        {
            Id = conversationId,
            IsGroup = true,
            Members = new List<ConversationMember>
            {
                new ConversationMember { UserId = currentUserId },
                new ConversationMember { UserId = secondMemberId },
                new ConversationMember { UserId = thirdMemberId }
            }
        };

        var createdMessage = new ConversationMessage
        {
            Id = Guid.NewGuid(),
            ConversationId = conversationId,
            SenderId = currentUserId,
            Message = "Hej allihopa"
        };

        _conversationRepository.Setup(r => r.IsConversationMemberAsync(conversationId, currentUserId)).ReturnsAsync(true);
        _conversationRepository.Setup(r => r.CreateMessageAsync(It.IsAny<ConversationMessage>())).ReturnsAsync(createdMessage);
        _conversationRepository.Setup(r => r.GetMessagesAsync(conversationId)).ReturnsAsync(new[] { createdMessage });
        _conversationRepository.Setup(r => r.GetConversationByIdAsync(conversationId)).ReturnsAsync(conversation);

        var result = await _conversationService.SendMessageAsync(currentUserId, conversationId, new CreateConversationMessageRequest
        {
            Message = "Hej allihopa"
        });

        result.Message.Should().Be("Hej allihopa");
        _notificationService.Verify(service => service.CreateGroupMessageNotificationAsync(secondMemberId, currentUserId, conversationId), Times.Once);
        _notificationService.Verify(service => service.CreateGroupMessageNotificationAsync(thirdMemberId, currentUserId, conversationId), Times.Once);
        _notificationService.Verify(service => service.CreateGroupMessageNotificationAsync(currentUserId, currentUserId, conversationId), Times.Never);
    }

    [Fact]
    public async Task SendMessageAsync_DirectConversation_DoesNotCreateGroupNotifications()
    {
        var currentUserId = Guid.NewGuid();
        var otherUserId = Guid.NewGuid();
        var conversationId = Guid.NewGuid();

        var conversation = new Conversation
        {
            Id = conversationId,
            IsGroup = false,
            Members = new List<ConversationMember>
            {
                new ConversationMember { UserId = currentUserId },
                new ConversationMember { UserId = otherUserId }
            }
        };

        var createdMessage = new ConversationMessage
        {
            Id = Guid.NewGuid(),
            ConversationId = conversationId,
            SenderId = currentUserId,
            Message = "Hej direkt"
        };

        _conversationRepository.Setup(r => r.IsConversationMemberAsync(conversationId, currentUserId)).ReturnsAsync(true);
        _conversationRepository.Setup(r => r.CreateMessageAsync(It.IsAny<ConversationMessage>())).ReturnsAsync(createdMessage);
        _conversationRepository.Setup(r => r.GetMessagesAsync(conversationId)).ReturnsAsync(new[] { createdMessage });
        _conversationRepository.Setup(r => r.GetConversationByIdAsync(conversationId)).ReturnsAsync(conversation);

        var result = await _conversationService.SendMessageAsync(currentUserId, conversationId, new CreateConversationMessageRequest
        {
            Message = "Hej direkt"
        });

        result.Message.Should().Be("Hej direkt");
        _notificationService.Verify(
            service => service.CreateGroupMessageNotificationAsync(It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<Guid>()),
            Times.Never);
    }

    [Fact]
    public async Task GetMessagesAsync_Throws_WhenUserIsNotConversationMember()
    {
        var currentUserId = Guid.NewGuid();
        var conversationId = Guid.NewGuid();

        _conversationRepository.Setup(r => r.IsConversationMemberAsync(conversationId, currentUserId)).ReturnsAsync(false);

        Func<Task> action = async () => await _conversationService.GetMessagesAsync(currentUserId, conversationId);

        await action.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("Du är inte medlem i den här konversationen.");
    }
}