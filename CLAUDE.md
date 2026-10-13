# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

RestaurantApp is an early-stage restaurant ordering app with two parts:

- `backend/`: ASP.NET Core Web API (.NET 10, controllers + OpenAPI) using EF Core with SQL Server. `Program.cs` sets up a CORS policy named `AllowAngularApp` (allows any origin).
- `frontend/`: Angular 19 app (standalone components, signals, built-in `@if`/`@for` control flow, SSR via `@angular/ssr`), styled with Bootstrap 5 + Bootstrap Icons (loaded through `angular.json` `styles`; no Bootstrap JS). Brand colours are CSS variables in `src/styles.css` (`--brand`, `--brand-dark`, `--brand-soft`); Bootstrap button variants are re-themed there because they don't read `--bs-primary`. Customer pages under `components/customer/` (`/menu`, `/cart`, `/checkout`), the cashier page under `components/cashier/` (`/cashier`), the menu-management page under `components/admin/` (`/admin`, add/edit/delete products and categories), the sales-report page `components/admin/reports/` (`/admin/reports`) and the staff login page under `components/auth/` (`/login`). Customers never log in; `/cashier` and `/admin` require a staff login (see **Staff auth** below).

Controllers under `Controllers/` (`CategoriesController`, `ProductsController`, `OrdersController`, `AuthController`) use `AppDbContext` directly (no service layer); request bodies are DTOs in `Dtos/`, responses are EF entities. The template `WeatherForecastController` is still present. There are no backend tests; the frontend has Playwright e2e tests in `frontend/tests/`.

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

`dotnet ef database update` also seeds a sample menu (`Data/SeedData.cs`, registered with `UseSeeding`/`UseAsyncSeeding` in `Program.cs`) — only when the `Categories` table is empty, so it never touches an existing menu. It also creates staff logins from the `StaffAccounts` config section (dev: `admin` / `Admin123!` and `cashier` / `Cashier123!` in `appsettings.Development.json`), only when the `Users` table is empty, so changing `StaffAccounts` later doesn't update existing accounts.

### Frontend (run from `frontend/`)

```bash
npm install
npm start                          # ng serve → http://localhost:4200
npm run build                      # production build (SSR) → dist/frontend
npm test                           # Karma + Jasmine (needs Chrome); add -- --watch=false --browsers=ChromeHeadless for a single headless run
npx ng test --include src/app/app.component.spec.ts   # single spec file
npm run serve:ssr:frontend         # serve SSR build → http://localhost:4000 (or $PORT)
npm run e2e                        # Playwright e2e tests in tests/ (Chromium); add -- tests/checkout.spec.ts or -g "<name>" to narrow
npx playwright show-report         # open the HTML report from the last run
```

Playwright (`playwright.config.ts`) starts the API (`dotnet run --project ../backend`) and `ng serve`, or reuses ones already running. The tests hit the real API and SQL Server database, and they **create real orders**. Pages are server-rendered, so open them with `gotoApp()` from `tests/helpers.ts`, which waits for hydration; clicks made before hydration do nothing. Staff pages need a login: `loginAs(page, request, 'admin' | 'cashier')` from `tests/helpers.ts` gets a token from the API and stores the session in `sessionStorage` before the page opens (the `STAFF` credentials there match the dev seed). Local runs use 4 workers, because more than that overloads the dev SSR server and tests time out.

CI (`.github/workflows/playwright.yml` at the repo root, on push/PR to `main`) runs the same suite against a SQL Server service container. It overrides `ConnectionStrings__DefaultConnection` with SQL auth, sets `ASPNETCORE_ENVIRONMENT=Development` (for the JWT key and staff accounts), and runs `dotnet ef database update` to create and seed the database first. CI uses 1 worker with 2 retries.

`src/main.server.ts` must pass the `BootstrapContext` through to `bootstrapApplication` (required by Angular 19.2.x patch releases); without it the build fails during route extraction with `NG0401: Missing Platform`. Likewise, SSR only renders for hosts listed in `angular.json` → `build.options.security.allowedHosts` (currently `localhost`, `127.0.0.1`); other hosts silently fall back to client-side rendering — add the production hostname there when deploying.

### Frontend ↔ API

- The API base URL is the single constant `API_BASE_URL` in `frontend/src/app/api.config.ts` (`http://localhost:5044/api`).
- HTTP calls live in `src/app/services/`: `ProductService` (products, categories, including the admin create/update/delete calls) and `OrderService` (list/get/create orders, update status). Components inject these, never `HttpClient` directly; `models/restaurant.models.ts` mirrors the backend entities as camelCase JSON (back-references are `null` due to `IgnoreCycles`). Keep it in sync when changing `backend/Models`.
- Don't redirect from a page based on cart contents in `ngOnInit`: on the server the cart is always empty (no `localStorage`), so SSR would redirect every request. Show an empty state instead.
- `CartService` holds the cart in signals shared across pages and persists it to `localStorage` only in the browser (guarded with `isPlatformBrowser`, since pages are server-rendered).
- `POST /api/orders` takes a `CreateOrderRequest` (`backend/Dtos`): `fulfillmentType` (`DineIn`|`Takeout`|`Delivery`) plus customer details that depend on it — `customerName` is required for every type; `Takeout` and `Delivery` also need `customerPhone` (stored as an empty string for `DineIn`), and `Delivery` also needs `deliveryAddress` (enforced in `IValidatableObject.Validate`; the checkout page mirrors this by only rendering the fields the chosen type needs, using `FULFILLMENT_OPTIONS` from the frontend models) plus `{ productId, quantity }` items only; the server looks up prices and computes `TotalAmount`. Model-validation failures come back as a problem-details `errors` object, which the checkout page flattens into one message. Never post the `Order` entity itself — its required navigation properties make model validation fail with 400. Order statuses are restricted to `Pending, Preparing, Ready, Completed, Cancelled` (`AllowedStatuses` in `OrdersController`, mirrored by `ORDER_STATUSES` in the frontend models).
- Menu admin endpoints: `POST`/`PUT /api/categories[/{id}]` take a `CategoryRequest` and `POST`/`PUT /api/products[/{id}]` take a `ProductRequest` (`backend/Dtos/MenuRequests.cs`). `GET /api/products` returns available products only unless `?includeUnavailable=true` (the admin page; admins only, others get 403). `DELETE` returns 409 for a category that still has products or a product that appears in past orders — the FKs cascade, so deleting them would wipe order history; mark products unavailable instead. `describeApiError()` (`services/api-error.ts`) turns these and validation errors into one message.
- **Error responses must be JSON problem details**: return `Problem(detail: "...", statusCode: StatusCodes.Status409Conflict)` (or 400/401), never `Conflict("...")`/`BadRequest("...")` with a string. With `withFetch()`, Angular fails to parse a plain-text error body and drops it (`err.error` becomes a `SyntaxError`), so the user would only see the generic fallback. `describeApiError()` reads `errors` (validation) and then `detail`.
- `GET /api/orders/report?from=yyyy-MM-dd&to=yyyy-MM-dd&timeZone=<IANA id>` (admins; `OrderReport` in `backend/Dtos/OrderReport.cs`) returns totals, a per-order-type breakdown, one row per day and products sold for **finished** orders (`Completed`/`Cancelled`) placed in that range. Revenue, items sold and products count `Completed` orders only. Dates are calendar days in `timeZone` (the frontend sends the browser's), converted to UTC because `OrderDate` is stored as UTC. The range can be at most 366 days, and it defaults to today. Orders are counted on the day they were placed (there is no completed-at timestamp).
- `HttpClient` is registered with `withFetch()` in `app.config.ts`. Routes use `RenderMode.Server` (`app.routes.server.ts`), not prerendering, so `ng build` never calls the API and pages render live data; the server fetches the data and hydration's HTTP transfer cache stops the browser from re-requesting it. The exceptions are `/admin`, `/admin/reports`, `/cashier` and `/login`, which use `RenderMode.Client` (see **Staff auth**).

### Staff auth

- **Backend**: `POST /api/auth/login` (`AuthController`, `LoginRequest`/`LoginResponse` in `Dtos/AuthDtos.cs`) checks the password against `User.PasswordHash` (ASP.NET Core `PasswordHasher<User>`) and returns `{ token, username, role, expiresAt }`. The token is an HS256 JWT signed with `Jwt:Key`, holding the user's role as a claim. A wrong username and a wrong password both get the same 401 message. JWT settings bind to `JwtOptions` (`Auth/JwtOptions.cs`, the `Jwt` config section). `Program.cs` refuses to start if `Jwt:Key` is shorter than 32 bytes. The dev key is in `appsettings.Development.json`; anywhere else, set `Jwt__Key` through the environment or a secret store.
- **Roles** are the constants in `Models/User.cs`: `Roles.Admin`, `Roles.Cashier`, and `Roles.Staff` (both, for `[Authorize(Roles = Roles.Staff)]`). Admins can do everything a cashier can.
- **Protected endpoints**: menu create/update/delete and `?includeUnavailable=true` need `Admin`. `GET /api/orders`, `GET /api/orders/{id}` and `PUT /api/orders/{id}/status` need `Staff`, because orders hold customer contact details. Reading the menu and `POST /api/orders` (customer checkout) stay anonymous. Add `[Authorize(Roles = ...)]` to any new staff-only endpoint.
- **Frontend**: `AuthService` keeps the session (`StaffSession`) in a signal and saves it to `sessionStorage` in the browser only, so each tab has its own sign-in and signing out in one tab never affects staff signed in elsewhere (closing the tab signs out). An expired token counts as signed out. `authInterceptor` (registered in `app.config.ts`) adds `Authorization: Bearer <token>` to API calls (but not to `/auth/*`), and on a 401 it signs the user out and sends them to `/login`. `staffGuard` checks `route.data.roles` in `app.routes.ts`, and if the check fails it redirects to `/login?returnUrl=…`. `LoginComponent` gets `returnUrl` as an input (`withComponentInputBinding()`), only follows in-app paths, and with no `returnUrl` it goes to `AuthService.homePage()` (`/admin` for admins, `/cashier` for cashiers). The navbar shows Admin/Cashier/Sign out links based on the role; customers see no staff links there, only a discreet "Staff login" link in the footer (hidden once signed in).
- **SSR**: the session exists only in browser `sessionStorage`, so the server can't run the guard or fetch staff data. That's why `/admin`, `/cashier` and `/login` render client-side (`RenderMode.Client`). Any new staff page needs the same entry in `app.routes.server.ts`.

## Architecture

- **Database**: SQL Server via `ConnectionStrings:DefaultConnection` in `appsettings.json` — `Server=localhost;Database=RestaurantDb;Trusted_Connection=True` (Windows auth, local default instance).
- **`Data/AppDbContext.cs`**: single DbContext exposing `Categories`, `Products`, `Orders`, `OrderItems`, `Users` (`Username` unique, max 50 characters). All money columns (`Product.Price`, `Order.TotalAmount`, `OrderItem.UnitPrice`) are configured to `decimal(18,2)` here — add the same precision config for any new decimal properties.
- **Domain model** (`Models/`, convention-based EF mapping, no data annotations):
  - `Category` 1→many `Product`
  - `Order` 1→many `OrderItem` (navigation named `Items`)
  - `OrderItem` → `Product`; `UnitPrice` is stored on the item (snapshot of price at order time)
  - `Order.Status` is a free-form string defaulting to `"Pending"`
  - `User` (staff only: `Username`, `PasswordHash`, `Role` = `"Admin"` | `"Cashier"`) has no relationships, and its table was added by the `AddStaffUsers` migration
- Navigation properties form cycles (`Category.Products` ↔ `Product.Category`, `Order.Items` ↔ `OrderItem.Order`). `Program.cs` sets `ReferenceHandler.IgnoreCycles`, so back-references serialize as `null` instead of throwing.
- Migrations live in `Migrations/` (namespace `backend.Migrations`); root namespace is `backend`.

## Repository note

`RestaurantApp/` is its own git repository (branch `main`).
