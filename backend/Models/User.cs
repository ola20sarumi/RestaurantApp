namespace backend.Models;

// Staff account for the admin and cashier pages. Customers don't log in.
public class User
{
    public int Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Role { get; set; } = Roles.Cashier;
}

public static class Roles
{
    public const string Admin = "Admin";
    public const string Cashier = "Cashier";

    // For [Authorize(Roles = ...)]: pages and endpoints both roles may use (admins can do everything a cashier can).
    public const string Staff = Admin + "," + Cashier;
}
