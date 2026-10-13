using backend.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace backend.Data;

// Sample menu and staff logins for a fresh database. Registered with UseSeeding/UseAsyncSeeding in Program.cs, so it runs on
// `dotnet ef database update` (and Database.Migrate/EnsureCreated). The menu is only inserted when there are no categories yet,
// and the staff accounts from the "StaffAccounts" config section only when there are no users yet.
public static class SeedData
{
    public static void Seed(DbContext context, IConfiguration configuration)
    {
        if (!context.Set<Category>().Any())
        {
            context.Set<Category>().AddRange(BuildMenu());
        }
        if (!context.Set<User>().Any())
        {
            context.Set<User>().AddRange(BuildStaff(configuration));
        }
        context.SaveChanges();
    }

    public static async Task SeedAsync(DbContext context, IConfiguration configuration, CancellationToken cancellationToken)
    {
        if (!await context.Set<Category>().AnyAsync(cancellationToken))
        {
            context.Set<Category>().AddRange(BuildMenu());
        }
        if (!await context.Set<User>().AnyAsync(cancellationToken))
        {
            context.Set<User>().AddRange(BuildStaff(configuration));
        }
        await context.SaveChangesAsync(cancellationToken);
    }

    // Development logins live in appsettings.Development.json; elsewhere nothing is seeded unless the section is configured.
    private static List<User> BuildStaff(IConfiguration configuration)
    {
        var hasher = new PasswordHasher<User>();
        var staff = new List<User>();
        foreach (var account in configuration.GetSection("StaffAccounts").GetChildren())
        {
            var user = new User { Username = account["Username"]!, Role = account["Role"]! };
            user.PasswordHash = hasher.HashPassword(user, account["Password"]!);
            staff.Add(user);
        }
        return staff;
    }

    private static List<Category> BuildMenu() =>
    [
        new Category
        {
            Name = "Appetizers",
            Description = "Starters to begin your meal",
            Products =
            [
                Item("Crispy Mozzarella Sticks", "Golden fried mozzarella served with warm marinara sauce.", 8.99m, "photo-1531749668029-2db88e4276c7"),
                Item("Garlic Herb Bread", "Toasted artisan bread topped with garlic butter and fresh parsley.", 5.50m, "photo-1556008531-57e6eefc7be4"),
                Item("Buffalo Chicken Wings", "8 crispy wings tossed in spicy buffalo sauce with ranch dip.", 11.99m, "photo-1567620832903-9fc6debc209f")
            ]
        },
        new Category
        {
            Name = "Main Courses",
            Description = "Hearty and delicious entrees",
            Products =
            [
                Item("Classic Cheeseburger", "Angus beef patty, cheddar, lettuce, tomato, and special sauce on brioche.", 13.99m, "photo-1568901346375-23c9450c58cd"),
                Item("Margherita Pizza", "Fresh mozzarella, San Marzano tomato sauce, and basil on crispy crust.", 14.50m, "photo-1604382354936-07c5d9983bd3"),
                Item("Fettuccine Alfredo", "Creamy parmesan sauce tossed with fresh fettuccine pasta.", 12.99m, "photo-1645112411341-6c4fd023714a"),
                Item("Grilled Salmon Bowl", "Wild-caught salmon with quinoa, roasted veggies, and lemon tahini.", 17.50m, "photo-1546069901-ba9599a7e63c")
            ]
        },
        new Category
        {
            Name = "Desserts & Drinks",
            Description = "Sweet treats and refreshing beverages",
            Products =
            [
                Item("Chocolate Lava Cake", "Warm chocolate cake with a molten center, served with vanilla ice cream.", 7.99m, "photo-1606313564200-e75d5e30476c"),
                Item("New York Cheesecake", "Classic creamy cheesecake with strawberry drizzle.", 6.99m, "photo-1533134242443-d4fd215305ad"),
                Item("Fresh Iced Lemonade", "House-made freshly squeezed lemonade over ice.", 3.50m, "photo-1513558161293-cdaf765ed2fd")
            ]
        }
    ];

    private static Product Item(string name, string description, decimal price, string unsplashPhoto) => new()
    {
        Name = name,
        Description = description,
        Price = price,
        ImageUrl = $"https://images.unsplash.com/{unsplashPhoto}",
        IsAvailable = true
    };
}
