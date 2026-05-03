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
    private readonly IValidator<CreatePostRequest> _createValidator;
    private readonly IValidator<UpdatePostRequest> _updateValidator;
    private readonly PostService _postService;

    public PostServiceTests()
    {
        _mockRepository = new Mock<IPostRepository>();
        _createValidator = new CreatePostRequestValidator();
        _updateValidator = new UpdatePostRequestValidator();
        _postService = new PostService(_mockRepository.Object, _createValidator, _updateValidator);
    }

    [Fact]
    public async Task CreatePostAsync_ValidInput_ReturnsPublicPostResponse()
    {
        var senderId = Guid.NewGuid();
        var request = new CreatePostRequest
        {
            SenderId = senderId,
            Message = "Detta är ett testmeddelande"
        };

        var expectedPost = new Post
        {
            Id = Guid.NewGuid(),
            SenderId = senderId,
            RecipientId = senderId,
            Message = request.Message,
            CreatedAt = DateTime.UtcNow
        };

        _mockRepository.Setup(r => r.UserExistsAsync(senderId)).ReturnsAsync(true);
        _mockRepository.Setup(r => r.CreateAsync(It.IsAny<Post>())).ReturnsAsync(expectedPost);

        var result = await _postService.CreatePostAsync(request);

        result.Should().NotBeNull();
        result.SenderId.Should().Be(senderId);
        result.RecipientId.Should().Be(senderId);
        result.Message.Should().Be(request.Message);
        result.Id.Should().Be(expectedPost.Id);

        _mockRepository.Verify(r => r.CreateAsync(It.Is<Post>(p =>
            p.SenderId == senderId &&
            p.RecipientId == senderId &&
            p.Message == request.Message)), Times.Once);
    }

    [Fact]
    public async Task CreatePostAsync_EmptyMessage_ThrowsValidationException()
    {
        var request = new CreatePostRequest
        {
            SenderId = Guid.NewGuid(),
            Message = string.Empty
        };

        await Assert.ThrowsAsync<ValidationException>(() => _postService.CreatePostAsync(request));
        _mockRepository.Verify(r => r.CreateAsync(It.IsAny<Post>()), Times.Never);
    }

    [Fact]
    public async Task CreatePostAsync_MessageTooLong_ThrowsValidationException()
    {
        var request = new CreatePostRequest
        {
            SenderId = Guid.NewGuid(),
            Message = new string('a', 501)
        };

        await Assert.ThrowsAsync<ValidationException>(() => _postService.CreatePostAsync(request));
        _mockRepository.Verify(r => r.CreateAsync(It.IsAny<Post>()), Times.Never);
    }

    [Fact]
    public async Task CreatePostAsync_InvalidSender_ThrowsArgumentException()
    {
        var senderId = Guid.NewGuid();
        var request = new CreatePostRequest
        {
            SenderId = senderId,
            Message = "Testmeddelande"
        };

        _mockRepository.Setup(r => r.UserExistsAsync(senderId)).ReturnsAsync(false);

        var exception = await Assert.ThrowsAsync<ArgumentException>(() => _postService.CreatePostAsync(request));

        exception.Message.Should().Contain("Avsändare");
        exception.Message.Should().Contain("finns inte");
        _mockRepository.Verify(r => r.CreateAsync(It.IsAny<Post>()), Times.Never);
    }

    [Fact]
    public async Task UpdatePostAsync_WhenOwnerUpdatesPost_ReturnsUpdatedPost()
    {
        var userId = Guid.NewGuid();
        var postId = Guid.NewGuid();
        var existingPost = new Post
        {
            Id = postId,
            SenderId = userId,
            RecipientId = userId,
            Message = "Gammalt innehåll",
            CreatedAt = DateTime.UtcNow.AddMinutes(-5)
        };

        _mockRepository.Setup(r => r.GetByIdAsync(postId)).ReturnsAsync(existingPost);
        _mockRepository.Setup(r => r.UpdateAsync(It.IsAny<Post>())).ReturnsAsync((Post post) => post);

        var result = await _postService.UpdatePostAsync(postId, userId, new UpdatePostRequest { Message = "Nytt innehåll" });

        result.Message.Should().Be("Nytt innehåll");
        _mockRepository.Verify(r => r.UpdateAsync(It.Is<Post>(p => p.Id == postId && p.Message == "Nytt innehåll")), Times.Once);
    }

    [Fact]
    public async Task UpdatePostAsync_WhenUserIsNotOwner_ThrowsUnauthorizedAccessException()
    {
        var postId = Guid.NewGuid();
        var ownerId = Guid.NewGuid();
        var otherUserId = Guid.NewGuid();
        var existingPost = new Post
        {
            Id = postId,
            SenderId = ownerId,
            RecipientId = ownerId,
            Message = "Original",
            CreatedAt = DateTime.UtcNow
        };

        _mockRepository.Setup(r => r.GetByIdAsync(postId)).ReturnsAsync(existingPost);

        Func<Task> act = () => _postService.UpdatePostAsync(postId, otherUserId, new UpdatePostRequest { Message = "Hackat" });

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
        _mockRepository.Verify(r => r.UpdateAsync(It.IsAny<Post>()), Times.Never);
    }

    [Fact]
    public async Task UpdatePostAsync_WhenPostDoesNotExist_ThrowsKeyNotFoundException()
    {
        var postId = Guid.NewGuid();
        _mockRepository.Setup(r => r.GetByIdAsync(postId)).ReturnsAsync((Post?)null);

        Func<Task> act = () => _postService.UpdatePostAsync(postId, Guid.NewGuid(), new UpdatePostRequest { Message = "Test" });

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task DeletePostAsync_WhenOwnerDeletesPost_CallsRepositoryDelete()
    {
        var userId = Guid.NewGuid();
        var postId = Guid.NewGuid();
        var existingPost = new Post
        {
            Id = postId,
            SenderId = userId,
            RecipientId = userId,
            Message = "Inlägg",
            CreatedAt = DateTime.UtcNow
        };

        _mockRepository.Setup(r => r.GetByIdAsync(postId)).ReturnsAsync(existingPost);
        _mockRepository.Setup(r => r.DeleteAsync(postId)).ReturnsAsync(true);

        await _postService.DeletePostAsync(postId, userId);

        _mockRepository.Verify(r => r.DeleteAsync(postId), Times.Once);
    }

    [Fact]
    public async Task DeletePostAsync_WhenUserIsNotOwner_ThrowsUnauthorizedAccessException()
    {
        var postId = Guid.NewGuid();
        var ownerId = Guid.NewGuid();
        var otherUserId = Guid.NewGuid();
        var existingPost = new Post
        {
            Id = postId,
            SenderId = ownerId,
            RecipientId = ownerId,
            Message = "Inlägg",
            CreatedAt = DateTime.UtcNow
        };

        _mockRepository.Setup(r => r.GetByIdAsync(postId)).ReturnsAsync(existingPost);

        Func<Task> act = () => _postService.DeletePostAsync(postId, otherUserId);

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
        _mockRepository.Verify(r => r.DeleteAsync(It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task DeletePostAsync_WhenPostDoesNotExist_ThrowsKeyNotFoundException()
    {
        var postId = Guid.NewGuid();
        _mockRepository.Setup(r => r.GetByIdAsync(postId)).ReturnsAsync((Post?)null);

        Func<Task> act = () => _postService.DeletePostAsync(postId, Guid.NewGuid());

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task CreatePostAsync_EmptySenderId_ThrowsArgumentException()
    {
        var request = new CreatePostRequest
        {
            SenderId = Guid.Empty,
            Message = "Testmeddelande"
        };

        _mockRepository.Setup(r => r.UserExistsAsync(Guid.Empty)).ReturnsAsync(false);

        var exception = await Assert.ThrowsAsync<ArgumentException>(() => _postService.CreatePostAsync(request));

        exception.Message.Should().Contain("Avsändare");
        exception.Message.Should().Contain("finns inte");
        _mockRepository.Verify(r => r.CreateAsync(It.IsAny<Post>()), Times.Never);
    }

    [Fact]
    public async Task CreatePostAsync_MessageWithOnlyWhitespace_ThrowsValidationException()
    {
        var request = new CreatePostRequest
        {
            SenderId = Guid.NewGuid(),
            Message = "   "
        };

        await Assert.ThrowsAsync<ValidationException>(() => _postService.CreatePostAsync(request));
        _mockRepository.Verify(r => r.CreateAsync(It.IsAny<Post>()), Times.Never);
    }

    [Fact]
    public async Task CreatePostAsync_NullMessage_ThrowsValidationException()
    {
        var request = new CreatePostRequest
        {
            SenderId = Guid.NewGuid(),
            Message = null!
        };

        await Assert.ThrowsAsync<ValidationException>(() => _postService.CreatePostAsync(request));
        _mockRepository.Verify(r => r.CreateAsync(It.IsAny<Post>()), Times.Never);
    }
}




