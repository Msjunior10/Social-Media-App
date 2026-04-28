using Microsoft.EntityFrameworkCore;
using SocialTDD.Application.Interfaces;
using SocialTDD.Domain.Entities;
using SocialTDD.Infrastructure.Data;

namespace SocialTDD.Infrastructure.Repositories;

public class FollowRepository : IFollowRepository
{
    private readonly ApplicationDbContext _context;

    public FollowRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Follow> CreateAsync(Follow follow)
    {
        _context.Follows.Add(follow);
        await _context.SaveChangesAsync();
        return follow;
    }

    public async Task<bool> FollowExistsAsync(Guid followerId, Guid followingId)
    {
        return await _context.Follows
            .AnyAsync(f => f.FollowerId == followerId && f.FollowingId == followingId);
    }

    public async Task<Follow?> GetFollowAsync(Guid followerId, Guid followingId)
    {
        return await _context.Follows
            .FirstOrDefaultAsync(f => f.FollowerId == followerId && f.FollowingId == followingId);
    }

    public async Task<bool> DeleteAsync(Guid followerId, Guid followingId)
    {
        var follow = await GetFollowAsync(followerId, followingId);
        if (follow == null)
        {
            return false;
        }

        _context.Follows.Remove(follow);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<IEnumerable<Follow>> GetFollowersAsync(Guid userId)
    {
        return await _context.Follows
            .Include(f => f.Follower)
            .Include(f => f.Following)
            .Where(f => f.FollowingId == userId)
            .ToListAsync();
    }

    public async Task<IEnumerable<Follow>> GetFollowingAsync(Guid userId)
    {
        return await _context.Follows
            .Include(f => f.Follower)
            .Include(f => f.Following)
            .Where(f => f.FollowerId == userId)
            .ToListAsync();
    }

    public async Task<bool> UserExistsAsync(Guid userId)
    {
        return await _context.Users.AnyAsync(u => u.Id == userId);
    }

    public async Task<bool> IsCircularFollowAsync(Guid followerId, Guid followingId)
    {
        // Kontrollera om followingId redan följer followerId (skapar cirkulär relation)
        // A följer B, och B följer A = cirkulär
        return await _context.Follows
            .AnyAsync(f => f.FollowerId == followingId && f.FollowingId == followerId);
    }
}