using Microsoft.EntityFrameworkCore;
using SocialTDD.Application.Interfaces;
using SocialTDD.Domain.Entities;
using SocialTDD.Infrastructure.Data;

namespace SocialTDD.Infrastructure.Repositories;

public class DirectMessageRepository : IDirectMessageRepository
{
    private readonly ApplicationDbContext _context;

    public DirectMessageRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<DirectMessage> CreateAsync(DirectMessage directMessage)
    {
        _context.DirectMessages.Add(directMessage);
        await _context.SaveChangesAsync();
        return directMessage;
    }

    public async Task<IEnumerable<DirectMessage>> GetByRecipientIdAsync(Guid recipientId)
    {
        return await _context.DirectMessages
            .Include(dm => dm.Sender)
            .Include(dm => dm.Recipient)
            .Where(dm => dm.RecipientId == recipientId)
            .OrderByDescending(dm => dm.CreatedAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<DirectMessage>> GetBySenderIdAsync(Guid senderId)
    {
        return await _context.DirectMessages
            .Include(dm => dm.Sender)
            .Include(dm => dm.Recipient)
            .Where(dm => dm.SenderId == senderId)
            .OrderByDescending(dm => dm.CreatedAt)
            .ToListAsync();
    }

    public async Task<DirectMessage?> GetByIdAsync(Guid id)
    {
        return await _context.DirectMessages
            .Include(dm => dm.Sender)
            .Include(dm => dm.Recipient)
            .FirstOrDefaultAsync(dm => dm.Id == id);
    }

    public async Task<bool> UserExistsAsync(Guid userId)
    {
        return await _context.Users.AnyAsync(u => u.Id == userId);
    }

    public async Task UpdateAsync(DirectMessage directMessage)
    {
        _context.DirectMessages.Update(directMessage);
        await _context.SaveChangesAsync();
    }
}

