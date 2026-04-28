using FluentAssertions;
using Moq;
using SocialTDD.Application.DTOs;
using SocialTDD.Application.Interfaces;
using SocialTDD.Application.Services;
using SocialTDD.Domain.Entities;

namespace SocialTDD.Tests.Services;

public class TimelineServiceTests
{
    private readonly Mock<IPostRepository> _mockRepository;
    private readonly TimelineService _timelineService;

    public TimelineServiceTests()
    {
        _mockRepository = new Mock<IPostRepository>();
        _timelineService = new TimelineService(_mockRepository.Object);
    }

    [Fact]
    public async Task GetTimelineAsync_ValidUser_ReturnsPostsInChronologicalOrder()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var senderId1 = Guid.NewGuid();
        var senderId2 = Guid.NewGuid();

        var posts = new List<Post>
        {
            new Post 
            { 
                Id = Guid.NewGuid(), 
                SenderId = senderId1, 
                RecipientId = userId, 
                Message = "Första inlägget", 
                CreatedAt = new DateTime(2024, 1, 1, 10, 0, 0),
                Sender = new User { Id = senderId1, Username = "User1" },
                Recipient = new User { Id = userId, Username = "TimelineUser" }
            },
            new Post 
            { 
                Id = Guid.NewGuid(), 
                SenderId = senderId2, 
                RecipientId = userId, 
                Message = "Tredje inlägget (senaste)", 
                CreatedAt = new DateTime(2024, 1, 1, 12, 0, 0),
                Sender = new User { Id = senderId2, Username = "User2" },
                Recipient = new User { Id = userId, Username = "TimelineUser" }
            },
            new Post 
            { 
                Id = Guid.NewGuid(), 
                SenderId = userId, 
                RecipientId = userId, 
                Message = "Eget inlägg", 
                CreatedAt = new DateTime(2024, 1, 1, 11, 0, 0),
                Sender = new User { Id = userId, Username = "TimelineUser" },
                Recipient = new User { Id = userId, Username = "TimelineUser" }
            }
        };

        _mockRepository.Setup(r => r.UserExistsAsync(userId)).ReturnsAsync(true);
        _mockRepository.Setup(r => r.GetTimelinePostsAsync(userId)).ReturnsAsync(posts);

        // Act
        var result = await _timelineService.GetTimelineAsync(userId);

        // Assert
        result.Should().NotBeNull();
        result.Should().HaveCount(3);
        
        // Verifiera kronologisk ordning (senaste först - descending)
        result[0].CreatedAt.Should().BeAfter(result[1].CreatedAt);
        result[1].CreatedAt.Should().BeAfter(result[2].CreatedAt);
        
        // Verifiera att första inlägget är det senaste (12:00)
        result[0].Message.Should().Be("Tredje inlägget (senaste)");
        // Verifiera att sista inlägget är det äldsta (10:00)
        result[2].Message.Should().Be("Första inlägget");
    }

    [Fact]
    public async Task GetTimelineAsync_UserWithNoPosts_ReturnsEmptyList()
    {
        // Arrange
        var userId = Guid.NewGuid();
        _mockRepository.Setup(r => r.UserExistsAsync(userId)).ReturnsAsync(true);
        _mockRepository.Setup(r => r.GetTimelinePostsAsync(userId)).ReturnsAsync(new List<Post>());

        // Act
        var result = await _timelineService.GetTimelineAsync(userId);

        // Assert
        result.Should().NotBeNull();
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task GetTimelineAsync_NonExistentUser_ThrowsArgumentException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        _mockRepository.Setup(r => r.UserExistsAsync(userId)).ReturnsAsync(false);

        // Act & Assert
        var exception = await Assert.ThrowsAsync<ArgumentException>(
            async () => await _timelineService.GetTimelineAsync(userId));
        
        exception.Message.Should().Contain("finns inte");
        _mockRepository.Verify(r => r.GetTimelinePostsAsync(It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task GetTimelineAsync_IncludesOwnPostsAndPostsFromOthers()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var otherUserId = Guid.NewGuid();
        
        var posts = new List<Post>
        {
            new Post 
            { 
                Id = Guid.NewGuid(), 
                SenderId = userId, 
                RecipientId = userId, 
                Message = "Mitt eget inlägg", 
                CreatedAt = DateTime.UtcNow,
                Sender = new User { Id = userId, Username = "Me" },
                Recipient = new User { Id = userId, Username = "Me" }
            },
            new Post 
            { 
                Id = Guid.NewGuid(), 
                SenderId = otherUserId, 
                RecipientId = userId, 
                Message = "Inlägg från någon annan", 
                CreatedAt = DateTime.UtcNow.AddMinutes(-10),
                Sender = new User { Id = otherUserId, Username = "Other" },
                Recipient = new User { Id = userId, Username = "Me" }
            }
        };

        _mockRepository.Setup(r => r.UserExistsAsync(userId)).ReturnsAsync(true);
        _mockRepository.Setup(r => r.GetTimelinePostsAsync(userId)).ReturnsAsync(posts);

        // Act
        var result = await _timelineService.GetTimelineAsync(userId);

        // Assert
        result.Should().HaveCount(2);
        result.Should().Contain(p => p.SenderId == userId);
        result.Should().Contain(p => p.SenderId != userId);
        result.Should().OnlyContain(p => p.RecipientId == userId);
    }

    [Fact]
    public async Task GetTimelineAsync_ViewingAnotherUsersTimeline_ReturnsTheirPosts()
    {
        // Arrange
        var viewingUserId = Guid.NewGuid();
        var timelineOwnerId = Guid.NewGuid();
        var otherSenderId = Guid.NewGuid();

        var posts = new List<Post>
        {
            new Post 
            { 
                Id = Guid.NewGuid(), 
                SenderId = otherSenderId, 
                RecipientId = timelineOwnerId, 
                Message = "Inlägg på annans tidslinje", 
                CreatedAt = DateTime.UtcNow,
                Sender = new User { Id = otherSenderId, Username = "Sender" },
                Recipient = new User { Id = timelineOwnerId, Username = "Owner" }
            },
            new Post 
            { 
                Id = Guid.NewGuid(), 
                SenderId = timelineOwnerId, 
                RecipientId = timelineOwnerId, 
                Message = "Eget inlägg från ägaren", 
                CreatedAt = DateTime.UtcNow.AddMinutes(-5),
                Sender = new User { Id = timelineOwnerId, Username = "Owner" },
                Recipient = new User { Id = timelineOwnerId, Username = "Owner" }
            }
        };

        _mockRepository.Setup(r => r.UserExistsAsync(timelineOwnerId)).ReturnsAsync(true);
        _mockRepository.Setup(r => r.GetTimelinePostsAsync(timelineOwnerId)).ReturnsAsync(posts);

        // Act
        var result = await _timelineService.GetTimelineAsync(timelineOwnerId);

        // Assert
        result.Should().HaveCount(2);
        result.Should().OnlyContain(p => p.RecipientId == timelineOwnerId);
        result[0].Message.Should().Be("Inlägg på annans tidslinje"); // Senaste först
    }

    [Fact]
    public async Task GetTimelineAsync_PostsWithSameTimestamp_ReturnsAllPosts()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var sameTimestamp = new DateTime(2024, 1, 1, 12, 0, 0);
        
        var posts = new List<Post>
        {
            new Post 
            { 
                Id = Guid.NewGuid(), 
                SenderId = Guid.NewGuid(), 
                RecipientId = userId, 
                Message = "Post 1", 
                CreatedAt = sameTimestamp,
                Sender = new User { Id = Guid.NewGuid(), Username = "User1" },
                Recipient = new User { Id = userId, Username = "TimelineUser" }
            },
            new Post 
            { 
                Id = Guid.NewGuid(), 
                SenderId = Guid.NewGuid(), 
                RecipientId = userId, 
                Message = "Post 2", 
                CreatedAt = sameTimestamp,
                Sender = new User { Id = Guid.NewGuid(), Username = "User2" },
                Recipient = new User { Id = userId, Username = "TimelineUser" }
            }
        };

        _mockRepository.Setup(r => r.UserExistsAsync(userId)).ReturnsAsync(true);
        _mockRepository.Setup(r => r.GetTimelinePostsAsync(userId)).ReturnsAsync(posts);

        // Act
        var result = await _timelineService.GetTimelineAsync(userId);

        // Assert
        result.Should().HaveCount(2);
        result.Should().OnlyContain(p => p.CreatedAt == sameTimestamp);
    }

    [Fact]
    public async Task GetTimelineAsync_OnlyReturnsPosts_NotDirectMessages()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var senderId = Guid.NewGuid();
        
        // Timeline ska bara returnera Posts, inte DirectMessages
        // Detta test verifierar att TimelineService endast använder PostRepository
        // och inte inkluderar DirectMessages i resultatet
        var posts = new List<Post>
        {
            new Post 
            { 
                Id = Guid.NewGuid(), 
                SenderId = senderId, 
                RecipientId = userId, 
                Message = "Ett publikt inlägg", 
                CreatedAt = DateTime.UtcNow,
                Sender = new User { Id = senderId, Username = "Sender" },
                Recipient = new User { Id = userId, Username = "Recipient" }
            }
        };

        _mockRepository.Setup(r => r.UserExistsAsync(userId)).ReturnsAsync(true);
        _mockRepository.Setup(r => r.GetTimelinePostsAsync(userId)).ReturnsAsync(posts);

        // Act
        var result = await _timelineService.GetTimelineAsync(userId);

        // Assert
        result.Should().NotBeNull();
        result.Should().HaveCount(1);
        result.Should().OnlyContain(p => p.Message == "Ett publikt inlägg");
        // Verifiera att TimelineService endast använder PostRepository
        // DirectMessages är separerade och visas inte här
        _mockRepository.Verify(r => r.GetTimelinePostsAsync(userId), Times.Once);
    }
}