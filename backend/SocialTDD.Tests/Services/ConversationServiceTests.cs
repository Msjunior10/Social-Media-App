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
}