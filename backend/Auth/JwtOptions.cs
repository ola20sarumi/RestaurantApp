namespace backend.Auth;

// Bound from the "Jwt" config section. The dev key lives in appsettings.Development.json;
// outside Development set Jwt__Key (at least 32 characters) through the environment or a secret store.
public class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Key { get; set; } = string.Empty;
    public string Issuer { get; set; } = "RestaurantApp";
    public string Audience { get; set; } = "RestaurantApp";
    public int ExpiryHours { get; set; } = 8;
}
