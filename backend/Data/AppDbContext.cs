using Microsoft.EntityFrameworkCore;
using backend.Models;

namespace backend.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<User> Users => Set<User>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Product>().Property(p => p.Price).HasPrecision(18, 2);
        modelBuilder.Entity<Order>().Property(o => o.TotalAmount).HasPrecision(18, 2);
        modelBuilder.Entity<OrderItem>().Property(oi => oi.UnitPrice).HasPrecision(18, 2);

        modelBuilder.Entity<Order>(order =>
        {
            order.Property(o => o.CustomerName).HasMaxLength(100);
            order.Property(o => o.CustomerPhone).HasMaxLength(30);
            order.Property(o => o.FulfillmentType).HasMaxLength(20).HasDefaultValue("Takeout");
            order.Property(o => o.DeliveryAddress).HasMaxLength(300);
            order.Property(o => o.CustomerEmail).HasMaxLength(254);
            order.Property(o => o.Reference).HasMaxLength(32);
            order.HasIndex(o => o.Reference).IsUnique();
            order.Property(o => o.PaymentMethod).HasMaxLength(20).HasDefaultValue(PaymentMethods.Counter);
            order.Property(o => o.PaymentStatus).HasMaxLength(20).HasDefaultValue(PaymentStatuses.Unpaid);
            order.Property(o => o.PaystackReference).HasMaxLength(100);
        });

        modelBuilder.Entity<User>(user =>
        {
            user.HasIndex(u => u.Username).IsUnique();
            user.Property(u => u.Username).HasMaxLength(50);
            user.Property(u => u.Role).HasMaxLength(20);
        });
    }
}
