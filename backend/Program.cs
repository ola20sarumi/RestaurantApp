using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using backend.Auth;
using backend.Data;
using backend.Models;
using backend.Payments;

var builder = WebApplication.CreateBuilder(args);

// 1. Register DbContext with SQL Server; an empty database gets a sample menu and staff logins on `dotnet ef database update`
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"))
        .UseSeeding((context, _) => SeedData.Seed(context, builder.Configuration))
        .UseAsyncSeeding((context, _, cancellationToken) => SeedData.SeedAsync(context, builder.Configuration, cancellationToken)));

// Staff (admin/cashier) authentication: POST /api/auth/login issues a JWT that the frontend sends as a bearer token.
var jwt = builder.Configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>() ?? new JwtOptions();
if (Encoding.UTF8.GetByteCount(jwt.Key) < 32)
{
    throw new InvalidOperationException("Jwt:Key must be set to at least 32 characters (see appsettings.Development.json).");
}
builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection(JwtOptions.SectionName));
builder.Services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidIssuer = jwt.Issuer,
            ValidAudience = jwt.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Key)),
            ClockSkew = TimeSpan.FromMinutes(1)
        };
    });
builder.Services.AddAuthorization();

// Online payment with Paystack (see Controllers/PaymentsController.cs). Without Paystack:SecretKey it is switched off.
builder.Services.Configure<PaystackOptions>(builder.Configuration.GetSection(PaystackOptions.SectionName));
builder.Services.AddHttpClient<PaystackClient>((services, client) =>
{
    var paystack = services.GetRequiredService<IOptions<PaystackOptions>>().Value;
    client.BaseAddress = new Uri(paystack.BaseUrl.TrimEnd('/') + "/");
    client.Timeout = TimeSpan.FromSeconds(30);
});

// 2. Add Controllers & OpenAPI
builder.Services.AddControllers()
    .AddJsonOptions(options =>
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles);
builder.Services.AddOpenApi();

// 3. Configure CORS to allow requests from Angular frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngularApp",
        policy => policy.AllowAnyOrigin()
                        .AllowAnyMethod()
                        .AllowAnyHeader());
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}
else
{
    // Only redirect to HTTPS outside Development, so the frontend can call http://localhost:5044
    // without being redirected to the https port (which breaks CORS preflight requests).
    app.UseHttpsRedirection();
}

// Enable CORS
app.UseCors("AllowAngularApp");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
