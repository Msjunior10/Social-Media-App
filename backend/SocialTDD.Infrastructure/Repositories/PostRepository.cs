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

    public async Task<Post?> GetByIdAsync(Guid id)
    {
        return await _context.Posts
            .Include(p => p.Sender)
            .Include(p => p.Recipient)
            .FirstOrDefaultAsync(p => p.Id == id);
    }

    public async Task<IEnumerable<Post>> GetByRecipientIdAsync(Guid recipientId)
    {
        return await _context.Posts
            .Include(p => p.Sender)
            .Include(p => p.Recipient)
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
            .Where(p => p.RecipientId == userId)
            .ToListAsync();
    }

    public async Task<IEnumerable<Post>> GetConversationAsync(Guid userId1, Guid userId2)
    {
        // Hämta alla meddelanden mellan två användare (båda riktningar)
        return await _context.Posts
            .Include(p => p.Sender)
            .Include(p => p.Recipient)
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
            .Where(p => senderIdsList.Contains(p.SenderId))
            .ToListAsync();
    }

    public async Task<bool> UserExistsAsync(Guid userId)
    {
        return await _context.Users.AnyAsync(u => u.Id == userId);
    }
}




