using Microsoft.EntityFrameworkCore;
using SocialTDD.Application.Interfaces;
using SocialTDD.Domain.Entities;
using SocialTDD.Infrastructure.Data;

namespace SocialTDD.Infrastructure.Repositories;

public class PostRepository : IPostRepository
{
    private readonly ApplicationDbContext _context;

    public PostRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Post> CreateAsync(Post post)
    {
        _context.Posts.Add(post);
        await _context.SaveChangesAsync();
        return post;
    }

    public async Task<Post> UpdateAsync(Post post)
    {
        _context.Posts.Update(post);
        await _context.SaveChangesAsync();
        return post;
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var post = await _context.Posts
            .Include(p => p.Reposts)
            .FirstOrDefaultAsync(p => p.Id == id);
        if (post == null)
        {
            return false;
        }

        if (post.Reposts.Any())
        {
            _context.Posts.RemoveRange(post.Reposts);
        }

        _context.Posts.Remove(post);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<IEnumerable<Post>> GetAllPostsAsync()
    {
        return await _context.Posts
            .Include(p => p.Sender)
            .Include(p => p.Recipient)
            .Include(p => p.OriginalPost)
                .ThenInclude(p => p!.Sender)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<Post>> GetAllPostsPageAsync(int page, int pageSize)
    {
        return await _context.Posts
            .Include(p => p.Sender)
            .Include(p => p.Recipient)
            .Include(p => p.OriginalPost)
                .ThenInclude(p => p!.Sender)
            .OrderByDescending(p => p.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
    }

    public async Task<int> CountAllPostsAsync()
    {
        return await _context.Posts.CountAsync();
    }

    public async Task<Post?> GetByIdAsync(Guid id)
    {
        return await _context.Posts
            .Include(p => p.Sender)
            .Include(p => p.Recipient)
            .Include(p => p.OriginalPost)
                .ThenInclude(p => p!.Sender)
            .FirstOrDefaultAsync(p => p.Id == id);
    }

    public async Task<IEnumerable<Post>> GetByRecipientIdAsync(Guid recipientId)
    {
        return await _context.Posts
            .Include(p => p.Sender)
            .Include(p => p.Recipient)
            .Include(p => p.OriginalPost)
                .ThenInclude(p => p!.Sender)
            .Where(p => p.RecipientId == recipientId)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<Post>> GetTimelinePostsAsync(Guid userId)
    {
        // Hämta alla posts där användaren är mottagare (sina egna eller från andra)
        // Detta inkluderar både posts där användaren är avsändare OCH mottagare
        return await _context.Posts
            .Include(p => p.Sender)
            .Include(p => p.Recipient)
            .Include(p => p.OriginalPost)
                .ThenInclude(p => p!.Sender)
            .Where(p => p.RecipientId == userId)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<Post>> GetTimelinePostsPageAsync(Guid userId, int page, int pageSize)
    {
        return await _context.Posts
            .Include(p => p.Sender)
            .Include(p => p.Recipient)
            .Include(p => p.OriginalPost)
                .ThenInclude(p => p!.Sender)
            .Where(p => p.RecipientId == userId)
            .OrderByDescending(p => p.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
    }

    public async Task<int> CountTimelinePostsAsync(Guid userId)
    {
        return await _context.Posts.CountAsync(p => p.RecipientId == userId);
    }

    public async Task<IEnumerable<Post>> GetConversationAsync(Guid userId1, Guid userId2)
    {
        // Hämta alla meddelanden mellan två användare (båda riktningar)
        return await _context.Posts
            .Include(p => p.Sender)
            .Include(p => p.Recipient)
            .Include(p => p.OriginalPost)
                .ThenInclude(p => p!.Sender)
            .Where(p => (p.SenderId == userId1 && p.RecipientId == userId2) ||
                       (p.SenderId == userId2 && p.RecipientId == userId1))
            .OrderBy(p => p.CreatedAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<Post>> GetPostsBySenderIdsAsync(IEnumerable<Guid> senderIds)
    {
        var senderIdsList = senderIds.ToList();
        if (!senderIdsList.Any())
        {
            return Enumerable.Empty<Post>();
        }

        return await _context.Posts
            .Include(p => p.Sender)
            .Include(p => p.Recipient)
            .Include(p => p.OriginalPost)
                .ThenInclude(p => p!.Sender)
            .Where(p => senderIdsList.Contains(p.SenderId))
            .ToListAsync();
    }

    public async Task<IEnumerable<Post>> GetBookmarkedPostsAsync(Guid userId)
    {
        return await _context.PostBookmarks
            .Where(b => b.UserId == userId)
            .OrderByDescending(b => b.CreatedAt)
            .Include(b => b.Post)
                .ThenInclude(p => p.Sender)
            .Include(b => b.Post)
                .ThenInclude(p => p.Recipient)
            .Include(b => b.Post)
                .ThenInclude(p => p.OriginalPost)
                    .ThenInclude(p => p!.Sender)
            .Select(b => b.Post)
            .ToListAsync();
    }

    public async Task<int> GetLikeCountAsync(Guid postId)
    {
        return await _context.PostLikes.CountAsync(l => l.PostId == postId);
    }

    public async Task<int> GetRepostCountAsync(Guid postId)
    {
        return await _context.Posts.CountAsync(p => p.OriginalPostId == postId && p.Message == string.Empty);
    }

    public async Task<bool> IsLikedByUserAsync(Guid postId, Guid userId)
    {
        return await _context.PostLikes.AnyAsync(l => l.PostId == postId && l.UserId == userId);
    }

    public async Task<bool> IsBookmarkedByUserAsync(Guid postId, Guid userId)
    {
        return await _context.PostBookmarks.AnyAsync(b => b.PostId == postId && b.UserId == userId);
    }

    public async Task<bool> IsRepostedByUserAsync(Guid postId, Guid userId)
    {
        return await _context.Posts.AnyAsync(p => p.OriginalPostId == postId && p.SenderId == userId && p.Message == string.Empty);
    }

    public async Task<Post?> GetRepostByUserAsync(Guid postId, Guid userId)
    {
        return await _context.Posts
            .Include(p => p.Sender)
            .Include(p => p.Recipient)
            .Include(p => p.OriginalPost)
                .ThenInclude(p => p!.Sender)
            .FirstOrDefaultAsync(p => p.OriginalPostId == postId && p.SenderId == userId && p.Message == string.Empty);
    }

    public async Task AddLikeAsync(PostLike like)
    {
        _context.PostLikes.Add(like);
        await _context.SaveChangesAsync();
    }

    public async Task RemoveLikeAsync(Guid postId, Guid userId)
    {
        var like = await _context.PostLikes.FirstOrDefaultAsync(l => l.PostId == postId && l.UserId == userId);
        if (like == null)
        {
            return;
        }

        _context.PostLikes.Remove(like);
        await _context.SaveChangesAsync();
    }

    public async Task AddBookmarkAsync(PostBookmark bookmark)
    {
        _context.PostBookmarks.Add(bookmark);
        await _context.SaveChangesAsync();
    }

    public async Task RemoveBookmarkAsync(Guid postId, Guid userId)
    {
        var bookmark = await _context.PostBookmarks.FirstOrDefaultAsync(b => b.PostId == postId && b.UserId == userId);
        if (bookmark == null)
        {
            return;
        }

        _context.PostBookmarks.Remove(bookmark);
        await _context.SaveChangesAsync();
    }

    public async Task<IEnumerable<PostComment>> GetCommentsByPostIdAsync(Guid postId)
    {
        return await _context.PostComments
            .Where(c => c.PostId == postId)
            .OrderBy(c => c.CreatedAt)
            .ToListAsync();
    }

    public async Task<PostComment?> GetCommentByIdAsync(Guid commentId)
    {
        return await _context.PostComments.FirstOrDefaultAsync(c => c.Id == commentId);
    }

    public async Task<PostComment> AddCommentAsync(PostComment comment)
    {
        _context.PostComments.Add(comment);
        await _context.SaveChangesAsync();
        return comment;
    }

    public async Task<PostComment> UpdateCommentAsync(PostComment comment)
    {
        _context.PostComments.Update(comment);
        await _context.SaveChangesAsync();
        return comment;
    }

    public async Task<bool> DeleteCommentAsync(Guid commentId)
    {
        var comment = await _context.PostComments.FirstOrDefaultAsync(c => c.Id == commentId);
        if (comment == null)
        {
            return false;
        }

        _context.PostComments.Remove(comment);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> UserExistsAsync(Guid userId)
    {
        return await _context.Users.AnyAsync(u => u.Id == userId);
    }
}




