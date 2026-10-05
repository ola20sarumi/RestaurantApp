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
        });
    }
}
