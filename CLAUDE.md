# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

RestaurantApp is an early-stage restaurant ordering app with two parts:

- `backend/`: ASP.NET Core Web API (.NET 10, controllers + OpenAPI) using EF Core with SQL Server. `Program.cs` sets up a CORS policy named `AllowAngularApp` (allows any origin).
- `frontend/`: Angular 19 app (standalone components, signals, built-in `@if`/`@for` control flow, SSR via `@angular/ssr`), styled with Bootstrap 5 + Bootstrap Icons (loaded through `angular.json` `styles`; no Bootstrap JS). Brand colours are CSS variables in `src/styles.css` (`--brand`, `--brand-dark`, `--brand-soft`); Bootstrap button variants are re-themed there because they don't read `--bs-primary`. Customer pages under `components/customer/` (`/menu`, `/cart`, `/checkout`) and the cashier page under `components/cashier/` (`/cashier`).

Controllers under `api/` (`CategoriesController`, `ProductsController`, `OrdersController`) use `AppDbContext` directly and return EF entities (no DTOs or service layer). The template `WeatherForecastController` is still present. There are no tests yet.

## Commands

### Backend (run from `backend/`)

```bash
dotnet build
dotnet run                        # http://localhost:5044 (default "http" profile)
dotnet run --launch-profile https # https://localhost:7096 + http://localhost:5044
```

Ports: the API is always `http://localhost:5044` in development (both profiles); `https://localhost:7096` is only added by the `https` profile. `UseHttpsRedirection` runs only outside Development, so the frontend should call `http://localhost:5044` (the Angular dev server runs on `http://localhost:4200`; CORS currently allows any origin). Only one instance can run at a time — a running `dotnet run`/`backend.exe` holds port 5044 and locks `bin/`, which makes `dotnet build` and `dotnet ef` fail; stop it first.

In Development, the OpenAPI document is served at `/openapi/v1.json` (no Swagger UI is configured). `backend.http` holds sample requests for the VS/VS Code REST client.

#### EF Core migrations

```bash
dotnet ef migrations add <Name>
dotnet ef database update
```

### Frontend (run from `frontend/`)

```bash
npm install
npm start                          # ng serve → http://localhost:4200
npm run build                      # production build (SSR) → dist/frontend
npm test                           # Karma + Jasmine (needs Chrome); add -- --watch=false --browsers=ChromeHeadless for a single headless run
npx ng test --include src/app/app.component.spec.ts   # single spec file
npm run serve:ssr:frontend         # serve SSR build → http://localhost:4000 (or $PORT)
```

`src/main.server.ts` must pass the `BootstrapContext` through to `bootstrapApplication` (required by Angular 19.2.x patch releases); without it the build fails during route extraction with `NG0401: Missing Platform`. Likewise, SSR only renders for hosts listed in `angular.json` → `build.options.security.allowedHosts` (currently `localhost`, `127.0.0.1`); other hosts silently fall back to client-side rendering — add the production hostname there when deploying.

### Frontend ↔ API

- The API base URL is the single constant `API_BASE_URL` in `frontend/src/app/api.config.ts` (`http://localhost:5044/api`).
- HTTP calls live in `src/app/services/`: `ProductService` (products, categories) and `OrderService` (list/get/create orders, update status). Components inject these, never `HttpClient` directly; `models/restaurant.models.ts` mirrors the backend entities as camelCase JSON (back-references are `null` due to `IgnoreCycles`). Keep it in sync when changing `backend/Models`.
- `CartService` holds the cart in signals shared across pages and persists it to `localStorage` only in the browser (guarded with `isPlatformBrowser`, since pages are server-rendered).
- `POST /api/orders` takes a `CreateOrderRequest` (`backend/Dtos`) of `{ productId, quantity }` items only; the server looks up prices and computes `TotalAmount`. Never post the `Order` entity itself — its required navigation properties make model validation fail with 400. Order statuses are restricted to `Pending, Preparing, Ready, Completed, Cancelled` (`AllowedStatuses` in `OrdersController`, mirrored by `ORDER_STATUSES` in the frontend models).
- `HttpClient` is registered with `withFetch()` in `app.config.ts`. Routes use `RenderMode.Server` (`app.routes.server.ts`), not prerendering, so `ng build` never calls the API and pages render live data; the server fetches the data and hydration's HTTP transfer cache stops the browser from re-requesting it.

## Architecture

- **Database**: SQL Server via `ConnectionStrings:DefaultConnection` in `appsettings.json` — `Server=localhost;Database=RestaurantDb;Trusted_Connection=True` (Windows auth, local default instance).
- **`Data/AppDbContext.cs`**: single DbContext exposing `Categories`, `Products`, `Orders`, `OrderItems`. All money columns (`Product.Price`, `Order.TotalAmount`, `OrderItem.UnitPrice`) are configured to `decimal(18,2)` here — add the same precision config for any new decimal properties.
- **Domain model** (`Models/`, convention-based EF mapping, no data annotations):
  - `Category` 1→many `Product`
  - `Order` 1→many `OrderItem` (navigation named `Items`)
  - `OrderItem` → `Product`; `UnitPrice` is stored on the item (snapshot of price at order time)
  - `Order.Status` is a free-form string defaulting to `"Pending"`
- Navigation properties form cycles (`Category.Products` ↔ `Product.Category`, `Order.Items` ↔ `OrderItem.Order`). `Program.cs` sets `ReferenceHandler.IgnoreCycles`, so back-references serialize as `null` instead of throwing.
- Migrations live in `Migrations/` (namespace `backend.Migrations`); root namespace is `backend`.

## Repository note

`RestaurantApp/` is its own git repository (branch `main`).
