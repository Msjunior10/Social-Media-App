using FluentAssertions;
using FluentValidation;
using Moq;
using SocialTDD.Application.DTOs;
using SocialTDD.Application.Interfaces;
using SocialTDD.Application.Services;
using SocialTDD.Application.Validators;
using SocialTDD.Domain.Entities;

namespace SocialTDD.Tests.Services;

public class FollowServiceTests
{
    private readonly Mock<IFollowRepository> _mockRepository;
    private readonly IValidator<CreateFollowRequest> _validator;
    private readonly FollowService _followService;

    public FollowServiceTests()
    {
        _mockRepository = new Mock<IFollowRepository>();
        _validator = new CreateFollowRequestValidator();
        _followService = new FollowService(_mockRepository.Object, _validator);
    }

    [Fact]
    public async Task FollowUserAsync_ValidInput_ReturnsFollowResponse()
    {
        // Arrange
        var followerId = Guid.NewGuid();
        var followingId = Guid.NewGuid();
        var request = new CreateFollowRequest
        {
            FollowerId = followerId,
            FollowingId = followingId
        };

        var expectedFollow = new Follow
        {
            Id = Guid.NewGuid(),
            FollowerId = followerId,
            FollowingId = followingId,
            CreatedAt = DateTime.UtcNow
        };

        _mockRepository.Setup(r => r.UserExistsAsync(followerId)).ReturnsAsync(true);
        _mockRepository.Setup(r => r.UserExistsAsync(followingId)).ReturnsAsync(true);
        _mockRepository.Setup(r => r.FollowExistsAsync(followerId, followingId)).ReturnsAsync(false);
        // Notera: IsCircularFollowAsync anropas inte längre eftersom ömsesidiga följ-relationer är tillåtna
        _mockRepository.Setup(r => r.CreateAsync(It.IsAny<Follow>())).ReturnsAsync(expectedFollow);

        // Act
        var result = await _followService.FollowUserAsync(request);

        // Assert
        result.Should().NotBeNull();
        result.FollowerId.Should().Be(followerId);
        result.FollowingId.Should().Be(followingId);
        result.Id.Should().Be(expectedFollow.Id);
        _mockRepository.Verify(r => r.CreateAsync(It.IsAny<Follow>()), Times.Once);
    }

    [Fact]
    public async Task FollowUserAsync_FollowerAndFollowingSame_ThrowsArgumentException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new CreateFollowRequest
        {
            FollowerId = userId,
            FollowingId = userId
        };

        _mockRepository.Setup(r => r.UserExistsAsync(userId)).ReturnsAsync(true);

        // Act & Assert
        var exception = await Assert.ThrowsAsync<ArgumentException>(() => _followService.FollowUserAsync(request));
        exception.Message.Should().Contain("kan inte följa sig själv");
        _mockRepository.Verify(r => r.CreateAsync(It.IsAny<Follow>()), Times.Never);
    }

    [Fact]
    public async Task FollowUserAsync_EmptyFollowerId_ThrowsArgumentException()
    {
        // Arrange
        var request = new CreateFollowRequest
        {
            FollowerId = Guid.Empty,
            FollowingId = Guid.NewGuid()
        };

        _mockRepository.Setup(r => r.UserExistsAsync(Guid.Empty)).ReturnsAsync(false);

        // Act & Assert
        var exception = await Assert.ThrowsAsync<ArgumentException>(() => _followService.FollowUserAsync(request));
        exception.Message.Should().Contain("finns inte");
        _mockRepository.Verify(r => r.CreateAsync(It.IsAny<Follow>()), Times.Never);
    }

    [Fact]
    public async Task FollowUserAsync_EmptyFollowingId_ThrowsValidationException()
    {
        // Arrange
        var request = new CreateFollowRequest
        {
            FollowerId = Guid.NewGuid(),
            FollowingId = Guid.Empty
        };

        // Act & Assert
        await Assert.ThrowsAsync<ValidationException>(() => _followService.FollowUserAsync(request));
    }

    [Fact]
    public async Task FollowUserAsync_InvalidFollower_ThrowsArgumentException()
    {
        // Arrange
        var followerId = Guid.NewGuid();
        var followingId = Guid.NewGuid();
        var request = new CreateFollowRequest
        {
            FollowerId = followerId,
            FollowingId = followingId
        };

        _mockRepository.Setup(r => r.UserExistsAsync(followerId)).ReturnsAsync(false);

        // Act & Assert
        var exception = await Assert.ThrowsAsync<ArgumentException>(() => _followService.FollowUserAsync(request));
        exception.Message.Should().Contain("finns inte");
        _mockRepository.Verify(r => r.CreateAsync(It.IsAny<Follow>()), Times.Never);
    }

    [Fact]
    public async Task FollowUserAsync_InvalidFollowing_ThrowsArgumentException()
    {
        // Arrange
        var followerId = Guid.NewGuid();
        var followingId = Guid.NewGuid();
        var request = new CreateFollowRequest
        {
            FollowerId = followerId,
            FollowingId = followingId
        };

        _mockRepository.Setup(r => r.UserExistsAsync(followerId)).ReturnsAsync(true);
        _mockRepository.Setup(r => r.UserExistsAsync(followingId)).ReturnsAsync(false);

        // Act & Assert
        var exception = await Assert.ThrowsAsync<ArgumentException>(() => _followService.FollowUserAsync(request));
        exception.Message.Should().Contain("finns inte");
        _mockRepository.Verify(r => r.CreateAsync(It.IsAny<Follow>()), Times.Never);
    }

    [Fact]
    public async Task FollowUserAsync_AlreadyFollowing_ThrowsInvalidOperationException()
    {
        // Arrange
        var followerId = Guid.NewGuid();
        var followingId = Guid.NewGuid();
        var request = new CreateFollowRequest
        {
            FollowerId = followerId,
            FollowingId = followingId
        };

        _mockRepository.Setup(r => r.UserExistsAsync(followerId)).ReturnsAsync(true);
        _mockRepository.Setup(r => r.UserExistsAsync(followingId)).ReturnsAsync(true);
        _mockRepository.Setup(r => r.FollowExistsAsync(followerId, followingId)).ReturnsAsync(true);

        // Act & Assert
        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() => _followService.FollowUserAsync(request));
        exception.Message.Should().Contain("följer redan");
        _mockRepository.Verify(r => r.CreateAsync(It.IsAny<Follow>()), Times.Never);
    }

    [Fact]
    public async Task FollowUserAsync_MutualFollow_IsAllowed()
    {
        // Arrange - Test att ömsesidiga följ-relationer är tillåtna
        // A följer B, och B följer A ska vara tillåtet
        var followerId = Guid.NewGuid();
        var followingId = Guid.NewGuid();
        var request = new CreateFollowRequest
        {
            FollowerId = followerId,
            FollowingId = followingId
        };

        var expectedFollow = new Follow
        {
            Id = Guid.NewGuid(),
            FollowerId = followerId,
            FollowingId = followingId,
            CreatedAt = DateTime.UtcNow
        };

        _mockRepository.Setup(r => r.UserExistsAsync(followerId)).ReturnsAsync(true);
        _mockRepository.Setup(r => r.UserExistsAsync(followingId)).ReturnsAsync(true);
        _mockRepository.Setup(r => r.FollowExistsAsync(followerId, followingId)).ReturnsAsync(false);
        // Notera: Vi kontrollerar inte längre IsCircularFollowAsync eftersom ömsesidiga följ-relationer är tillåtna
        _mockRepository.Setup(r => r.CreateAsync(It.IsAny<Follow>())).ReturnsAsync(expectedFollow);

        // Act
        var result = await _followService.FollowUserAsync(request);

        // Assert
        result.Should().NotBeNull();
        result.FollowerId.Should().Be(followerId);
        result.FollowingId.Should().Be(followingId);
        _mockRepository.Verify(r => r.CreateAsync(It.IsAny<Follow>()), Times.Once);
    }

    [Fact]
    public async Task UnfollowUserAsync_ValidInput_DeletesFollow()
    {
        // Arrange
        var followerId = Guid.NewGuid();
        var followingId = Guid.NewGuid();

        _mockRepository.Setup(r => r.FollowExistsAsync(followerId, followingId)).ReturnsAsync(true);
        _mockRepository.Setup(r => r.DeleteAsync(followerId, followingId)).ReturnsAsync(true);

        // Act
        await _followService.UnfollowUserAsync(followerId, followingId);

        // Assert
        _mockRepository.Verify(r => r.DeleteAsync(followerId, followingId), Times.Once);
    }

    [Fact]
    public async Task UnfollowUserAsync_NotFollowing_ThrowsInvalidOperationException()
    {
        // Arrange
        var followerId = Guid.NewGuid();
        var followingId = Guid.NewGuid();

        _mockRepository.Setup(r => r.FollowExistsAsync(followerId, followingId)).ReturnsAsync(false);

        // Act & Assert
        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() => _followService.UnfollowUserAsync(followerId, followingId));
        exception.Message.Should().Contain("följer inte");
        _mockRepository.Verify(r => r.DeleteAsync(It.IsAny<Guid>(), It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task GetFollowersAsync_ValidUser_ReturnsListOfFollowers()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var follower1Id = Guid.NewGuid();
        var follower2Id = Guid.NewGuid();

        var follows = new List<Follow>
        {
            new Follow
            {
                Id = Guid.NewGuid(),
                FollowerId = follower1Id,
                FollowingId = userId,
                CreatedAt = DateTime.UtcNow.AddDays(-1)
            },
            new Follow
            {
                Id = Guid.NewGuid(),
                FollowerId = follower2Id,
                FollowingId = userId,
                CreatedAt = DateTime.UtcNow
            }
        };

        _mockRepository.Setup(r => r.UserExistsAsync(userId)).ReturnsAsync(true);
        _mockRepository.Setup(r => r.GetFollowersAsync(userId)).ReturnsAsync(follows);

        // Act
        var result = await _followService.GetFollowersAsync(userId);

        // Assert
        result.Should().NotBeNull();
        result.Should().HaveCount(2);
        result.Should().OnlyContain(f => f.FollowingId == userId);
    }

    [Fact]
    public async Task GetFollowingAsync_ValidUser_ReturnsListOfFollowing()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var following1Id = Guid.NewGuid();
        var following2Id = Guid.NewGuid();

        var follows = new List<Follow>
        {
            new Follow
            {
                Id = Guid.NewGuid(),
                FollowerId = userId,
                FollowingId = following1Id,
                CreatedAt = DateTime.UtcNow.AddDays(-1)
            },
            new Follow
            {
                Id = Guid.NewGuid(),
                FollowerId = userId,
                FollowingId = following2Id,
                CreatedAt = DateTime.UtcNow
            }
        };

        _mockRepository.Setup(r => r.UserExistsAsync(userId)).ReturnsAsync(true);
        _mockRepository.Setup(r => r.GetFollowingAsync(userId)).ReturnsAsync(follows);

        // Act
        var result = await _followService.GetFollowingAsync(userId);

        // Assert
        result.Should().NotBeNull();
        result.Should().HaveCount(2);
        result.Should().OnlyContain(f => f.FollowerId == userId);
    }

    [Fact]
    public async Task GetFollowersAsync_NonExistentUser_ThrowsArgumentException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        _mockRepository.Setup(r => r.UserExistsAsync(userId)).ReturnsAsync(false);

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(() => _followService.GetFollowersAsync(userId));
    }

    [Fact]
    public async Task GetFollowingAsync_NonExistentUser_ThrowsArgumentException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        _mockRepository.Setup(r => r.UserExistsAsync(userId)).ReturnsAsync(false);

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(() => _followService.GetFollowingAsync(userId));
    }
}