using System.Security.Claims;
using System.Text;
using backend.Auth;
using backend.Data;
using backend.Dtos;
using backend.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IPasswordHasher<User> _passwordHasher;
    private readonly JwtOptions _jwt;

    public AuthController(AppDbContext context, IPasswordHasher<User> passwordHasher, IOptions<JwtOptions> jwt)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _jwt = jwt.Value;
    }

    // Staff login for the admin and cashier pages; returns a bearer token for the Authorization header.
    [HttpPost("login")]
    public async Task<ActionResult<LoginResponse>> Login(LoginRequest request)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == request.Username.Trim());
        var result = user == null
            ? PasswordVerificationResult.Failed
            : _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);

        // Same message for an unknown user and a wrong password, so usernames can't be probed.
        if (user == null || result == PasswordVerificationResult.Failed)
        {
            return Problem(detail: "Incorrect username or password.", statusCode: StatusCodes.Status401Unauthorized);
        }

        if (result == PasswordVerificationResult.SuccessRehashNeeded)
        {
            user.PasswordHash = _passwordHasher.HashPassword(user, request.Password);
            await _context.SaveChangesAsync();
        }

        var expiresAt = DateTime.UtcNow.AddHours(_jwt.ExpiryHours);
        var token = new JsonWebTokenHandler().CreateToken(new SecurityTokenDescriptor
        {
            Issuer = _jwt.Issuer,
            Audience = _jwt.Audience,
            Subject = new ClaimsIdentity(
            [
                new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.Username),
                new Claim(ClaimTypes.Role, user.Role)
            ]),
            Expires = expiresAt,
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwt.Key)), SecurityAlgorithms.HmacSha256)
        });

        return new LoginResponse(token, user.Username, user.Role, expiresAt);
    }
}
