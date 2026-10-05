# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

RestaurantApp is an early-stage restaurant ordering app. Currently only the `backend/` exists: an ASP.NET Core Web API (.NET 10, controllers + OpenAPI) using EF Core with SQL Server. `Program.cs` sets up a CORS policy named `AllowAngularApp` (allows any origin) for a planned Angular frontend that has not been created yet.

The only controller is still the template `WeatherForecastController` (plus `WeatherForecast.cs`); there are no domain controllers, services, or tests yet.

## Commands

Run from `backend/`:

```bash
dotnet build
dotnet run                        # http://localhost:5044 (default "http" profile)
dotnet run --launch-profile https # https://localhost:7096 + http://localhost:5044
```

In Development, the OpenAPI document is served at `/openapi/v1.json` (no Swagger UI is configured). `backend.http` holds sample requests for the VS/VS Code REST client.

### EF Core migrations

```bash
dotnet ef migrations add <Name>
dotnet ef database update
```

The global `dotnet-ef` tool installed is 9.x while the project uses EF Core 10 packages; update it (`dotnet tool update -g dotnet-ef`) if it complains about version mismatch.

## Architecture

- **Database**: SQL Server via `ConnectionStrings:DefaultConnection` in `appsettings.json` — `Server=localhost;Database=RestaurantDb;Trusted_Connection=True` (Windows auth, local default instance).
- **`Data/AppDbContext.cs`**: single DbContext exposing `Categories`, `Products`, `Orders`, `OrderItems`. All money columns (`Product.Price`, `Order.TotalAmount`, `OrderItem.UnitPrice`) are configured to `decimal(18,2)` here — add the same precision config for any new decimal properties.
- **Domain model** (`Models/`, convention-based EF mapping, no data annotations):
  - `Category` 1→many `Product`
  - `Order` 1→many `OrderItem` (navigation named `Items`)
  - `OrderItem` → `Product`; `UnitPrice` is stored on the item (snapshot of price at order time)
  - `Order.Status` is a free-form string defaulting to `"Pending"`
- Navigation properties are not cycle-safe for JSON serialization; returning entities with both sides loaded directly from controllers will hit reference cycles (use DTOs/projections or configure `ReferenceHandler`).
- Migrations live in `Migrations/` (namespace `backend.Migrations`); root namespace is `backend`.

## Repository note

`RestaurantApp/` is its own git repository (branch `main`).
