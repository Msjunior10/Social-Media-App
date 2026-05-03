using Microsoft.EntityFrameworkCore;
using SocialTDD.Application.Interfaces;
using SocialTDD.Domain.Entities;
using SocialTDD.Infrastructure.Data;

namespace SocialTDD.Infrastructure.Repositories;

public class NotificationRepository : INotificationRepository
{
    private readonly ApplicationDbContext _context;

    public NotificationRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Notification> CreateAsync(Notification notification)
    {
        _context.Notifications.Add(notification);
        await _context.SaveChangesAsync();
        return notification;
    }

    public async Task<IEnumerable<Notification>> GetByUserIdAsync(Guid userId)
    {
        return await _context.Notifications
            .Include(n => n.Actor)
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt)
            .ToListAsync();
    }

    public async Task<int> GetUnreadCountAsync(Guid userId)
    {
        return await _context.Notifications.CountAsync(n => n.UserId == userId && !n.IsRead);
    }

    public async Task<Notification?> GetByIdAsync(Guid notificationId)
    {
        return await _context.Notifications
            .Include(n => n.Actor)
            .FirstOrDefaultAsync(n => n.Id == notificationId);
    }

    public async Task MarkAsReadAsync(Guid notificationId, Guid userId)
    {
        await _context.Notifications
            .Where(n => n.Id == notificationId && n.UserId == userId)
            .ExecuteUpdateAsync(setters => setters.SetProperty(n => n.IsRead, true));
    }

    public async Task MarkAllAsReadAsync(Guid userId)
    {
        await _context.Notifications
            .Where(n => n.UserId == userId && !n.IsRead)
            .ExecuteUpdateAsync(setters => setters.SetProperty(n => n.IsRead, true));
    }

    public async Task<bool> UserExistsAsync(Guid userId)
    {
        return await _context.Users.AnyAsync(u => u.Id == userId);
    }
}
