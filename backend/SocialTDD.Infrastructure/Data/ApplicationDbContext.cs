using Microsoft.EntityFrameworkCore;
using SocialTDD.Domain.Entities;

namespace SocialTDD.Infrastructure.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<Post> Posts { get; set; }
    public DbSet<PostLike> PostLikes { get; set; }
    public DbSet<PostBookmark> PostBookmarks { get; set; }
    public DbSet<PostComment> PostComments { get; set; }
    public DbSet<User> Users { get; set; }
    public DbSet<DirectMessage> DirectMessages { get; set; }
    public DbSet<Follow> Follows { get; set; }
    public DbSet<Notification> Notifications { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Post>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Message).IsRequired().HasMaxLength(500);
            entity.Property(e => e.ImageUrl).HasMaxLength(2048);
            entity.Property(e => e.CreatedAt).IsRequired();

            entity.HasOne(e => e.Sender)
                .WithMany()
                .HasForeignKey(e => e.SenderId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Recipient)
                .WithMany()
                .HasForeignKey(e => e.RecipientId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.OriginalPost)
                .WithMany(p => p.Reposts)
                .HasForeignKey(e => e.OriginalPostId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasMany(e => e.Likes)
                .WithOne(l => l.Post)
                .HasForeignKey(l => l.PostId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(e => e.Comments)
                .WithOne(c => c.Post)
                .HasForeignKey(c => c.PostId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(e => e.Bookmarks)
                .WithOne(b => b.Post)
                .HasForeignKey(b => b.PostId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => e.OriginalPostId);
        });

        modelBuilder.Entity<PostLike>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.CreatedAt).IsRequired();

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => new { e.PostId, e.UserId }).IsUnique();
        });

        modelBuilder.Entity<PostBookmark>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.CreatedAt).IsRequired();

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => new { e.PostId, e.UserId }).IsUnique();
            entity.HasIndex(e => new { e.UserId, e.CreatedAt });
        });

        modelBuilder.Entity<PostComment>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Message).IsRequired().HasMaxLength(500);
            entity.Property(e => e.CreatedAt).IsRequired();

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Username).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Email).IsRequired().HasMaxLength(255);
            entity.Property(e => e.Bio).HasMaxLength(500);
            entity.Property(e => e.ProfileImageUrl).HasMaxLength(2048);
            entity.Property(e => e.CreatedAt).IsRequired();
            entity.Property(e => e.LastActiveAt).IsRequired();

            entity.HasIndex(e => e.Username).IsUnique();
            entity.HasIndex(e => e.Email).IsUnique();
        });

        modelBuilder.Entity<DirectMessage>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Message).IsRequired().HasMaxLength(500);
            entity.Property(e => e.MediaUrl).HasMaxLength(2048);
            entity.Property(e => e.CreatedAt).IsRequired();
            entity.Property(e => e.IsRead).IsRequired().HasDefaultValue(false);

            entity.HasOne(e => e.Sender)
                .WithMany()
                .HasForeignKey(e => e.SenderId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Recipient)
                .WithMany()
                .HasForeignKey(e => e.RecipientId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Follow>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.CreatedAt).IsRequired();

            entity.HasOne(e => e.Follower)
                .WithMany()
                .HasForeignKey(e => e.FollowerId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Following)
                .WithMany()
                .HasForeignKey(e => e.FollowingId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => new { e.FollowerId, e.FollowingId })
                .IsUnique();
        });

        modelBuilder.Entity<Notification>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Type).IsRequired().HasMaxLength(50);
            entity.Property(e => e.CreatedAt).IsRequired();
            entity.Property(e => e.IsRead).IsRequired().HasDefaultValue(false);

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Actor)
                .WithMany()
                .HasForeignKey(e => e.ActorId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => new { e.UserId, e.IsRead, e.CreatedAt });
        });
    }
}




