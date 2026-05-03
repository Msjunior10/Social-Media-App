using FluentAssertions;
using Moq;
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
    public async Task GetWallAsync_WithMultipleUsers_ReturnsPostsFromAllUsers()
    {
        var userId = Guid.NewGuid();
        var user1Id = Guid.NewGuid();
        var user2Id = Guid.NewGuid();

        var posts = new List<Post>
        {
            new()
            {
                Id = Guid.NewGuid(),
                SenderId = user1Id,
                RecipientId = user1Id,
                Message = "Post från användare 1",
                CreatedAt = DateTime.UtcNow.AddHours(-2),
                Sender = new User { Id = user1Id, Username = "User1" },
                Recipient = new User { Id = user1Id, Username = "User1" }
            },
            new()
            {
                Id = Guid.NewGuid(),
                SenderId = user2Id,
                RecipientId = user2Id,
                Message = "Post från användare 2",
                CreatedAt = DateTime.UtcNow.AddHours(-1),
                Sender = new User { Id = user2Id, Username = "User2" },
                Recipient = new User { Id = user2Id, Username = "User2" }
            }
        };

        _mockPostRepository.Setup(r => r.UserExistsAsync(userId)).ReturnsAsync(true);
        _mockPostRepository.Setup(r => r.GetAllPostsAsync()).ReturnsAsync(posts);

        var result = await _wallService.GetWallAsync(userId);

        result.Should().HaveCount(2);
        result.Should().Contain(p => p.SenderId == user1Id);
        result.Should().Contain(p => p.SenderId == user2Id);
    }

    [Fact]
    public async Task GetWallAsync_WithNoPosts_ReturnsEmptyList()
    {
        var userId = Guid.NewGuid();

        _mockPostRepository.Setup(r => r.UserExistsAsync(userId)).ReturnsAsync(true);
        _mockPostRepository.Setup(r => r.GetAllPostsAsync()).ReturnsAsync(new List<Post>());

        var result = await _wallService.GetWallAsync(userId);

        result.Should().NotBeNull();
        result.Should().BeEmpty();
        _mockPostRepository.Verify(r => r.GetAllPostsAsync(), Times.Once);
    }

    [Fact]
    public async Task GetWallAsync_ReturnsPostsInChronologicalOrder_NewestFirst()
    {
        var userId = Guid.NewGuid();
        var user1Id = Guid.NewGuid();
        var user2Id = Guid.NewGuid();

        var oldestPost = new Post
        {
            Id = Guid.NewGuid(),
            SenderId = user1Id,
            RecipientId = user1Id,
            Message = "Äldsta posten",
            CreatedAt = new DateTime(2024, 1, 1, 10, 0, 0),
            Sender = new User { Id = user1Id, Username = "User1" },
            Recipient = new User { Id = user1Id, Username = "User1" }
        };

        var middlePost = new Post
        {
            Id = Guid.NewGuid(),
            SenderId = user2Id,
            RecipientId = user2Id,
            Message = "Mellersta posten",
            CreatedAt = new DateTime(2024, 1, 1, 11, 0, 0),
            Sender = new User { Id = user2Id, Username = "User2" },
            Recipient = new User { Id = user2Id, Username = "User2" }
        };

        var newestPost = new Post
        {
            Id = Guid.NewGuid(),
            SenderId = user1Id,
            RecipientId = user1Id,
            Message = "Nyaste posten",
            CreatedAt = new DateTime(2024, 1, 1, 12, 0, 0),
            Sender = new User { Id = user1Id, Username = "User1" },
            Recipient = new User { Id = user1Id, Username = "User1" }
        };

        _mockPostRepository.Setup(r => r.UserExistsAsync(userId)).ReturnsAsync(true);
        _mockPostRepository.Setup(r => r.GetAllPostsAsync()).ReturnsAsync(new List<Post> { oldestPost, middlePost, newestPost });

        var result = await _wallService.GetWallAsync(userId);

        result.Should().HaveCount(3);
        result[0].Message.Should().Be("Nyaste posten");
        result[1].Message.Should().Be("Mellersta posten");
        result[2].Message.Should().Be("Äldsta posten");
    }

    [Fact]
    public async Task GetWallAsync_NonExistentUser_ThrowsArgumentException()
    {
        var userId = Guid.NewGuid();
        _mockPostRepository.Setup(r => r.UserExistsAsync(userId)).ReturnsAsync(false);

        var exception = await Assert.ThrowsAsync<ArgumentException>(() => _wallService.GetWallAsync(userId));

        exception.Message.Should().Contain("finns inte");
        _mockFollowRepository.Verify(r => r.GetFollowingAsync(It.IsAny<Guid>()), Times.Never);
        _mockPostRepository.Verify(r => r.GetAllPostsAsync(), Times.Never);
    }
}