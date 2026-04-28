using FluentAssertions;
using Moq;
using SocialTDD.Application.DTOs;
using SocialTDD.Application.Interfaces;
using SocialTDD.Application.Services;
using SocialTDD.Domain.Entities;

namespace SocialTDD.Tests.Services;

public class WallServiceTests
{
    private readonly Mock<IFollowRepository> _mockFollowRepository;
    private readonly Mock<IPostRepository> _mockPostRepository;
    private readonly WallService _wallService;

    public WallServiceTests()
    {
        _mockFollowRepository = new Mock<IFollowRepository>();
        _mockPostRepository = new Mock<IPostRepository>();
        _wallService = new WallService(_mockFollowRepository.Object, _mockPostRepository.Object);
    }

    [Fact]
    public async Task GetWallAsync_WithMultipleFollowedUsers_ReturnsPostsFromAllFollowedUsers()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var followedUser1Id = Guid.NewGuid();
        var followedUser2Id = Guid.NewGuid();

        var follows = new List<Follow>
        {
            new Follow
            {
                Id = Guid.NewGuid(),
                FollowerId = userId,
                FollowingId = followedUser1Id,
                CreatedAt = DateTime.UtcNow
            },
            new Follow
            {
                Id = Guid.NewGuid(),
                FollowerId = userId,
                FollowingId = followedUser2Id,
                CreatedAt = DateTime.UtcNow
            }
        };

        var posts = new List<Post>
        {
            new Post
            {
                Id = Guid.NewGuid(),
                SenderId = followedUser1Id,
                RecipientId = followedUser1Id,
                Message = "Post från följd användare 1",
                CreatedAt = DateTime.UtcNow.AddHours(-2),
                Sender = new User { Id = followedUser1Id, Username = "FollowedUser1" },
                Recipient = new User { Id = followedUser1Id, Username = "FollowedUser1" }
            },
            new Post
            {
                Id = Guid.NewGuid(),
                SenderId = followedUser2Id,
                RecipientId = followedUser2Id,
                Message = "Post från följd användare 2",
                CreatedAt = DateTime.UtcNow.AddHours(-1),
                Sender = new User { Id = followedUser2Id, Username = "FollowedUser2" },
                Recipient = new User { Id = followedUser2Id, Username = "FollowedUser2" }
            }
        };

        _mockPostRepository.Setup(r => r.UserExistsAsync(userId)).ReturnsAsync(true);
        _mockFollowRepository.Setup(r => r.GetFollowingAsync(userId)).ReturnsAsync(follows);
        _mockPostRepository.Setup(r => r.GetPostsBySenderIdsAsync(It.Is<IEnumerable<Guid>>(ids => 
            ids.Contains(followedUser1Id) && ids.Contains(followedUser2Id))))
            .ReturnsAsync(posts);

        // Act
        var result = await _wallService.GetWallAsync(userId);

        // Assert
        result.Should().NotBeNull();
        result.Should().HaveCount(2);
        result.Should().Contain(p => p.SenderId == followedUser1Id);
        result.Should().Contain(p => p.SenderId == followedUser2Id);
    }

    [Fact]
    public async Task GetWallAsync_WithNoFollowedUsers_ReturnsEmptyList()
    {
        // Arrange
        var userId = Guid.NewGuid();

        _mockPostRepository.Setup(r => r.UserExistsAsync(userId)).ReturnsAsync(true);
        _mockFollowRepository.Setup(r => r.GetFollowingAsync(userId)).ReturnsAsync(new List<Follow>());

        // Act
        var result = await _wallService.GetWallAsync(userId);

        // Assert
        result.Should().NotBeNull();
        result.Should().BeEmpty();
        _mockPostRepository.Verify(r => r.GetPostsBySenderIdsAsync(It.IsAny<IEnumerable<Guid>>()), Times.Never);
    }

    [Fact]
    public async Task GetWallAsync_ReturnsPostsInChronologicalOrder_NewestFirst()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var followedUser1Id = Guid.NewGuid();
        var followedUser2Id = Guid.NewGuid();

        var follows = new List<Follow>
        {
            new Follow
            {
                Id = Guid.NewGuid(),
                FollowerId = userId,
                FollowingId = followedUser1Id,
                CreatedAt = DateTime.UtcNow
            },
            new Follow
            {
                Id = Guid.NewGuid(),
                FollowerId = userId,
                FollowingId = followedUser2Id,
                CreatedAt = DateTime.UtcNow
            }
        };

        var oldestPost = new Post
        {
            Id = Guid.NewGuid(),
            SenderId = followedUser1Id,
            RecipientId = followedUser1Id,
            Message = "Äldsta posten",
            CreatedAt = new DateTime(2024, 1, 1, 10, 0, 0),
            Sender = new User { Id = followedUser1Id, Username = "FollowedUser1" },
            Recipient = new User { Id = followedUser1Id, Username = "FollowedUser1" }
        };

        var middlePost = new Post
        {
            Id = Guid.NewGuid(),
            SenderId = followedUser2Id,
            RecipientId = followedUser2Id,
            Message = "Mellersta posten",
            CreatedAt = new DateTime(2024, 1, 1, 11, 0, 0),
            Sender = new User { Id = followedUser2Id, Username = "FollowedUser2" },
            Recipient = new User { Id = followedUser2Id, Username = "FollowedUser2" }
        };

        var newestPost = new Post
        {
            Id = Guid.NewGuid(),
            SenderId = followedUser1Id,
            RecipientId = followedUser1Id,
            Message = "Nyaste posten",
            CreatedAt = new DateTime(2024, 1, 1, 12, 0, 0),
            Sender = new User { Id = followedUser1Id, Username = "FollowedUser1" },
            Recipient = new User { Id = followedUser1Id, Username = "FollowedUser1" }
        };

        var posts = new List<Post> { oldestPost, middlePost, newestPost };

        _mockPostRepository.Setup(r => r.UserExistsAsync(userId)).ReturnsAsync(true);
        _mockFollowRepository.Setup(r => r.GetFollowingAsync(userId)).ReturnsAsync(follows);
        _mockPostRepository.Setup(r => r.GetPostsBySenderIdsAsync(It.IsAny<IEnumerable<Guid>>()))
            .ReturnsAsync(posts);

        // Act
        var result = await _wallService.GetWallAsync(userId);

        // Assert
        result.Should().NotBeNull();
        result.Should().HaveCount(3);
        
        // Verifiera kronologisk ordning (senaste först - descending)
        result[0].CreatedAt.Should().BeAfter(result[1].CreatedAt);
        result[1].CreatedAt.Should().BeAfter(result[2].CreatedAt);
        
        // Verifiera att första inlägget är det senaste
        result[0].Message.Should().Be("Nyaste posten");
        // Verifiera att sista inlägget är det äldsta
        result[2].Message.Should().Be("Äldsta posten");
    }

    [Fact]
    public async Task GetWallAsync_ExcludesPostsFromNonFollowedUsers()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var followedUser1Id = Guid.NewGuid();
        var nonFollowedUserId = Guid.NewGuid();

        var follows = new List<Follow>
        {
            new Follow
            {
                Id = Guid.NewGuid(),
                FollowerId = userId,
                FollowingId = followedUser1Id,
                CreatedAt = DateTime.UtcNow
            }
        };

        var posts = new List<Post>
        {
            new Post
            {
                Id = Guid.NewGuid(),
                SenderId = followedUser1Id,
                RecipientId = followedUser1Id,
                Message = "Post från följd användare",
                CreatedAt = DateTime.UtcNow,
                Sender = new User { Id = followedUser1Id, Username = "FollowedUser1" },
                Recipient = new User { Id = followedUser1Id, Username = "FollowedUser1" }
            },
            new Post
            {
                Id = Guid.NewGuid(),
                SenderId = nonFollowedUserId,
                RecipientId = nonFollowedUserId,
                Message = "Post från icke-följd användare",
                CreatedAt = DateTime.UtcNow,
                Sender = new User { Id = nonFollowedUserId, Username = "NonFollowedUser" },
                Recipient = new User { Id = nonFollowedUserId, Username = "NonFollowedUser" }
            }
        };

        _mockPostRepository.Setup(r => r.UserExistsAsync(userId)).ReturnsAsync(true);
        _mockFollowRepository.Setup(r => r.GetFollowingAsync(userId)).ReturnsAsync(follows);
        // Mock returnerar bara posts från följda användare
        _mockPostRepository.Setup(r => r.GetPostsBySenderIdsAsync(It.Is<IEnumerable<Guid>>(ids => 
            ids.Contains(followedUser1Id) && !ids.Contains(nonFollowedUserId))))
            .ReturnsAsync(posts.Where(p => p.SenderId == followedUser1Id).ToList());

        // Act
        var result = await _wallService.GetWallAsync(userId);

        // Assert
        result.Should().NotBeNull();
        result.Should().HaveCount(1);
        result.Should().OnlyContain(p => p.SenderId == followedUser1Id);
        result.Should().NotContain(p => p.SenderId == nonFollowedUserId);
    }

    [Fact]
    public async Task GetWallAsync_NonExistentUser_ThrowsArgumentException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        _mockPostRepository.Setup(r => r.UserExistsAsync(userId)).ReturnsAsync(false);

        // Act & Assert
        var exception = await Assert.ThrowsAsync<ArgumentException>(
            async () => await _wallService.GetWallAsync(userId));
        
        exception.Message.Should().Contain("finns inte");
        _mockFollowRepository.Verify(r => r.GetFollowingAsync(It.IsAny<Guid>()), Times.Never);
        _mockPostRepository.Verify(r => r.GetPostsBySenderIdsAsync(It.IsAny<IEnumerable<Guid>>()), Times.Never);
    }
}