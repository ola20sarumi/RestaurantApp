using System.ComponentModel.DataAnnotations;

namespace backend.Dtos;

public class LoginRequest
{
    [Required(ErrorMessage = "Username is required.")]
    public string Username { get; set; } = string.Empty;

    [Required(ErrorMessage = "Password is required.")]
    public string Password { get; set; } = string.Empty;
}

public record LoginResponse(string Token, string Username, string Role, DateTime ExpiresAt);
