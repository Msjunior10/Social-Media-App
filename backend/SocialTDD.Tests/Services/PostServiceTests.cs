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
    private readonly Mock<IUserRepository> _mockUserRepository;
    private readonly Mock<INotificationService> _mockNotificationService;
    private readonly IValidator<CreatePostRequest> _createValidator;
    private readonly IValidator<UpdatePostRequest> _updateValidator;
    private readonly IValidator<CreatePostCommentRequest> _commentValidator;
    private readonly PostService _postService;

    public PostServiceTests()
    {
        _mockRepository = new Mock<IPostRepository>();
        _mockUserRepository = new Mock<IUserRepository>();
        _mockNotificationService = new Mock<INotificationService>();
        _createValidator = new CreatePostRequestValidator();
        _updateValidator = new UpdatePostRequestValidator();
        _commentValidator = new CreatePostCommentRequestValidator();
        _mockRepository.Setup(r => r.GetCommentsByPostIdAsync(It.IsAny<Guid>())).ReturnsAsync(new List<PostComment>());
        _mockRepository.Setup(r => r.GetCommentByIdAsync(It.IsAny<Guid>())).ReturnsAsync((Guid commentId) => new PostComment { Id = commentId, PostId = Guid.NewGuid(), UserId = Guid.NewGuid(), Message = "Kommentar", CreatedAt = DateTime.UtcNow });
        _mockRepository.Setup(r => r.GetLikeCountAsync(It.IsAny<Guid>())).ReturnsAsync(0);
        _mockRepository.Setup(r => r.GetRepostCountAsync(It.IsAny<Guid>())).ReturnsAsync(0);
        _mockRepository.Setup(r => r.IsLikedByUserAsync(It.IsAny<Guid>(), It.IsAny<Guid>())).ReturnsAsync(false);
        _mockRepository.Setup(r => r.IsBookmarkedByUserAsync(It.IsAny<Guid>(), It.IsAny<Guid>())).ReturnsAsync(false);
        _mockRepository.Setup(r => r.IsRepostedByUserAsync(It.IsAny<Guid>(), It.IsAny<Guid>())).ReturnsAsync(false);
        _postService = new PostService(_mockRepository.Object, _mockUserRepository.Object, _createValidator, _updateValidator, _commentValidator, _mockNotificationService.Object);
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
    public async Task CreatePostAsync_WithMentions_CreatesMentionNotificationsForUniqueUsers()
    {
        var senderId = Guid.NewGuid();
        var mentionedUserId = Guid.NewGuid();
        var request = new CreatePostRequest
        {
            SenderId = senderId,
            Message = "Hej @alice och igen @alice"
        };

        var createdPost = new Post
        {
            Id = Guid.NewGuid(),
            SenderId = senderId,
            RecipientId = senderId,
            Message = request.Message,
            CreatedAt = DateTime.UtcNow
        };

        _mockRepository.Setup(r => r.UserExistsAsync(senderId)).ReturnsAsync(true);
        _mockRepository.Setup(r => r.CreateAsync(It.IsAny<Post>())).ReturnsAsync(createdPost);
        _mockUserRepository.Setup(r => r.GetUserByUsernameAsync("alice")).ReturnsAsync(new User { Id = mentionedUserId, Username = "alice" });

        await _postService.CreatePostAsync(request);

        _mockNotificationService.Verify(n => n.CreatePostMentionNotificationAsync(mentionedUserId, senderId, createdPost.Id), Times.Once);
    }

    [Fact]
    public async Task GetPostByIdAsync_WhenPostExists_ReturnsMappedPost()
    {
        var currentUserId = Guid.NewGuid();
        var postId = Guid.NewGuid();
        var post = new Post
        {
            Id = postId,
            SenderId = Guid.NewGuid(),
            RecipientId = Guid.NewGuid(),
            Message = "Detaljpost",
            CreatedAt = DateTime.UtcNow
        };

        _mockRepository.Setup(r => r.GetByIdAsync(postId)).ReturnsAsync(post);

        var result = await _postService.GetPostByIdAsync(postId, currentUserId);

        result.Id.Should().Be(postId);
        result.Message.Should().Be("Detaljpost");
    }

    [Fact]
    public async Task GetPostByIdAsync_WhenPostIsMissing_ThrowsKeyNotFoundException()
    {
        var postId = Guid.NewGuid();
        _mockRepository.Setup(r => r.GetByIdAsync(postId)).ReturnsAsync((Post?)null);

        Func<Task> act = () => _postService.GetPostByIdAsync(postId, Guid.NewGuid());

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task AddCommentAsync_WithMentionForPostOwner_DoesNotDuplicateCommentNotificationAsMention()
    {
        var postId = Guid.NewGuid();
        var postOwnerId = Guid.NewGuid();
        var actorUserId = Guid.NewGuid();
        var request = new CreatePostCommentRequest { Message = "Hej @owner" };

        _mockRepository.Setup(r => r.GetByIdAsync(postId)).ReturnsAsync(new Post
        {
            Id = postId,
            SenderId = postOwnerId,
            RecipientId = postOwnerId,
            Message = "Original",
            CreatedAt = DateTime.UtcNow
        });
        _mockRepository.Setup(r => r.UserExistsAsync(actorUserId)).ReturnsAsync(true);
        _mockRepository.Setup(r => r.AddCommentAsync(It.IsAny<PostComment>())).ReturnsAsync((PostComment comment) => comment);
        _mockUserRepository.Setup(r => r.GetUserByUsernameAsync("owner")).ReturnsAsync(new User { Id = postOwnerId, Username = "owner" });

        await _postService.AddCommentAsync(postId, actorUserId, request);

        _mockNotificationService.Verify(n => n.CreatePostCommentNotificationAsync(postOwnerId, actorUserId, postId), Times.Once);
        _mockNotificationService.Verify(n => n.CreateCommentMentionNotificationAsync(It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<Guid>()), Times.Never);
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

    [Fact]
    public async Task BookmarkPostAsync_WhenPostExists_ReturnsBookmarkedResponse()
    {
        var userId = Guid.NewGuid();
        var postId = Guid.NewGuid();
        var post = new Post
        {
            Id = postId,
            SenderId = Guid.NewGuid(),
            RecipientId = Guid.NewGuid(),
            Message = "Spara detta",
            CreatedAt = DateTime.UtcNow
        };

        _mockRepository.Setup(r => r.GetByIdAsync(postId)).ReturnsAsync(post);
        _mockRepository.Setup(r => r.UserExistsAsync(userId)).ReturnsAsync(true);
        _mockRepository.SetupSequence(r => r.IsBookmarkedByUserAsync(postId, userId))
            .ReturnsAsync(false)
            .ReturnsAsync(true);

        var result = await _postService.BookmarkPostAsync(postId, userId);

        result.IsBookmarkedByCurrentUser.Should().BeTrue();
        _mockRepository.Verify(r => r.AddBookmarkAsync(It.Is<PostBookmark>(b => b.PostId == postId && b.UserId == userId)), Times.Once);
    }

    [Fact]
    public async Task GetSavedPostsAsync_WhenUserExists_ReturnsSavedPosts()
    {
        var userId = Guid.NewGuid();
        var postId = Guid.NewGuid();
        var savedPosts = new List<Post>
        {
            new()
            {
                Id = postId,
                SenderId = Guid.NewGuid(),
                RecipientId = Guid.NewGuid(),
                Message = "Sparat inlägg",
                CreatedAt = DateTime.UtcNow
            }
        };

        _mockRepository.Setup(r => r.UserExistsAsync(userId)).ReturnsAsync(true);
        _mockRepository.Setup(r => r.GetBookmarkedPostsAsync(userId)).ReturnsAsync(savedPosts);
        _mockRepository.Setup(r => r.IsBookmarkedByUserAsync(It.IsAny<Guid>(), userId)).ReturnsAsync(true);

        var result = await _postService.GetSavedPostsAsync(userId);

        result.Should().HaveCount(1);
        result[0].IsBookmarkedByCurrentUser.Should().BeTrue();
        result[0].Id.Should().Be(postId);
    }

    [Fact]
    public async Task RepostAsync_WhenPostExists_CreatesRepostAndReturnsUpdatedOriginalState()
    {
        var userId = Guid.NewGuid();
        var postId = Guid.NewGuid();
        var post = new Post
        {
            Id = postId,
            SenderId = Guid.NewGuid(),
            RecipientId = Guid.NewGuid(),
            Message = "Originalinlägg",
            CreatedAt = DateTime.UtcNow
        };

        _mockRepository.Setup(r => r.GetByIdAsync(postId)).ReturnsAsync(post);
        _mockRepository.Setup(r => r.UserExistsAsync(userId)).ReturnsAsync(true);
        _mockRepository.Setup(r => r.GetRepostByUserAsync(postId, userId)).ReturnsAsync((Post?)null);
        _mockRepository.Setup(r => r.IsRepostedByUserAsync(postId, userId)).ReturnsAsync(true);

        var result = await _postService.RepostAsync(postId, userId);

        result.IsRepostedByCurrentUser.Should().BeTrue();
        result.RepostCount.Should().Be(0);
        _mockRepository.Verify(r => r.CreateAsync(It.Is<Post>(p => p.OriginalPostId == postId && p.SenderId == userId)), Times.Once);
        _mockNotificationService.Verify(n => n.CreatePostRepostNotificationAsync(post.SenderId, userId, postId), Times.Once);
    }

    [Fact]
    public async Task RepostAsync_WhenRepostAlreadyExists_DoesNotCreateDuplicateOrNotification()
    {
        var userId = Guid.NewGuid();
        var postId = Guid.NewGuid();
        var post = new Post
        {
            Id = postId,
            SenderId = Guid.NewGuid(),
            RecipientId = Guid.NewGuid(),
            Message = "Originalinlägg",
            CreatedAt = DateTime.UtcNow
        };

        var existingRepost = new Post
        {
            Id = Guid.NewGuid(),
            SenderId = userId,
            RecipientId = userId,
            OriginalPostId = postId,
            CreatedAt = DateTime.UtcNow
        };

        _mockRepository.Setup(r => r.GetByIdAsync(postId)).ReturnsAsync(post);
        _mockRepository.Setup(r => r.UserExistsAsync(userId)).ReturnsAsync(true);
        _mockRepository.Setup(r => r.GetRepostByUserAsync(postId, userId)).ReturnsAsync(existingRepost);
        _mockRepository.Setup(r => r.IsRepostedByUserAsync(postId, userId)).ReturnsAsync(true);

        var result = await _postService.RepostAsync(postId, userId);

        result.IsRepostedByCurrentUser.Should().BeTrue();
        _mockRepository.Verify(r => r.CreateAsync(It.IsAny<Post>()), Times.Never);
        _mockNotificationService.Verify(n => n.CreatePostRepostNotificationAsync(It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task RemoveRepostAsync_WhenRepostExists_DeletesRepost()
    {
        var userId = Guid.NewGuid();
        var postId = Guid.NewGuid();
        var repostId = Guid.NewGuid();
        var post = new Post
        {
            Id = postId,
            SenderId = Guid.NewGuid(),
            RecipientId = Guid.NewGuid(),
            Message = "Originalinlägg",
            CreatedAt = DateTime.UtcNow
        };

        var repost = new Post
        {
            Id = repostId,
            SenderId = userId,
            RecipientId = userId,
            OriginalPostId = postId,
            CreatedAt = DateTime.UtcNow
        };

        _mockRepository.Setup(r => r.GetByIdAsync(postId)).ReturnsAsync(post);
        _mockRepository.Setup(r => r.GetRepostByUserAsync(postId, userId)).ReturnsAsync(repost);

        await _postService.RemoveRepostAsync(postId, userId);

        _mockRepository.Verify(r => r.DeleteAsync(repostId), Times.Once);
    }

    [Fact]
    public async Task DeleteCommentAsync_WhenOwnerDeletesComment_CallsRepositoryDelete()
    {
        var userId = Guid.NewGuid();
        var postId = Guid.NewGuid();
        var commentId = Guid.NewGuid();
        var post = new Post
        {
            Id = postId,
            SenderId = Guid.NewGuid(),
            RecipientId = Guid.NewGuid(),
            Message = "Inlägg",
            CreatedAt = DateTime.UtcNow
        };
        var comment = new PostComment
        {
            Id = commentId,
            PostId = postId,
            UserId = userId,
            Message = "Min kommentar",
            CreatedAt = DateTime.UtcNow
        };

        _mockRepository.Setup(r => r.GetByIdAsync(postId)).ReturnsAsync(post);
        _mockRepository.Setup(r => r.GetCommentByIdAsync(commentId)).ReturnsAsync(comment);
        _mockRepository.Setup(r => r.DeleteCommentAsync(commentId)).ReturnsAsync(true);

        await _postService.DeleteCommentAsync(postId, commentId, userId);

        _mockRepository.Verify(r => r.DeleteCommentAsync(commentId), Times.Once);
    }

    [Fact]
    public async Task DeleteCommentAsync_WhenUserIsNotOwner_ThrowsUnauthorizedAccessException()
    {
        var userId = Guid.NewGuid();
        var otherUserId = Guid.NewGuid();
        var postId = Guid.NewGuid();
        var commentId = Guid.NewGuid();
        var post = new Post
        {
            Id = postId,
            SenderId = Guid.NewGuid(),
            RecipientId = Guid.NewGuid(),
            Message = "Inlägg",
            CreatedAt = DateTime.UtcNow
        };
        var comment = new PostComment
        {
            Id = commentId,
            PostId = postId,
            UserId = otherUserId,
            Message = "Någon annans kommentar",
            CreatedAt = DateTime.UtcNow
        };

        _mockRepository.Setup(r => r.GetByIdAsync(postId)).ReturnsAsync(post);
        _mockRepository.Setup(r => r.GetCommentByIdAsync(commentId)).ReturnsAsync(comment);

        Func<Task> act = () => _postService.DeleteCommentAsync(postId, commentId, userId);

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
        _mockRepository.Verify(r => r.DeleteCommentAsync(It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task UpdateCommentAsync_WhenOwnerUpdatesComment_ReturnsUpdatedComment()
    {
        var userId = Guid.NewGuid();
        var postId = Guid.NewGuid();
        var commentId = Guid.NewGuid();
        var post = new Post
        {
            Id = postId,
            SenderId = Guid.NewGuid(),
            RecipientId = Guid.NewGuid(),
            Message = "Inlägg",
            CreatedAt = DateTime.UtcNow
        };
        var comment = new PostComment
        {
            Id = commentId,
            PostId = postId,
            UserId = userId,
            Message = "Gammal kommentar",
            CreatedAt = DateTime.UtcNow
        };

        _mockRepository.Setup(r => r.GetByIdAsync(postId)).ReturnsAsync(post);
        _mockRepository.Setup(r => r.GetCommentByIdAsync(commentId)).ReturnsAsync(comment);
        _mockRepository.Setup(r => r.UpdateCommentAsync(It.IsAny<PostComment>())).ReturnsAsync((PostComment updatedComment) => updatedComment);

        var result = await _postService.UpdateCommentAsync(postId, commentId, userId, new CreatePostCommentRequest { Message = "Ny kommentar" });

        result.Message.Should().Be("Ny kommentar");
        _mockRepository.Verify(r => r.UpdateCommentAsync(It.Is<PostComment>(c => c.Id == commentId && c.Message == "Ny kommentar")), Times.Once);
    }

    [Fact]
    public async Task UpdateCommentAsync_WhenUserIsNotOwner_ThrowsUnauthorizedAccessException()
    {
        var userId = Guid.NewGuid();
        var otherUserId = Guid.NewGuid();
        var postId = Guid.NewGuid();
        var commentId = Guid.NewGuid();
        var post = new Post
        {
            Id = postId,
            SenderId = Guid.NewGuid(),
            RecipientId = Guid.NewGuid(),
            Message = "Inlägg",
            CreatedAt = DateTime.UtcNow
        };
        var comment = new PostComment
        {
            Id = commentId,
            PostId = postId,
            UserId = otherUserId,
            Message = "Kommentar",
            CreatedAt = DateTime.UtcNow
        };

        _mockRepository.Setup(r => r.GetByIdAsync(postId)).ReturnsAsync(post);
        _mockRepository.Setup(r => r.GetCommentByIdAsync(commentId)).ReturnsAsync(comment);

        Func<Task> act = () => _postService.UpdateCommentAsync(postId, commentId, userId, new CreatePostCommentRequest { Message = "Hackad" });

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
        _mockRepository.Verify(r => r.UpdateCommentAsync(It.IsAny<PostComment>()), Times.Never);
    }
}




