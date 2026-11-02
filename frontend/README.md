# Frontend

The Angular 19 app for RestaurantApp, with server-side rendering (Angular SSR). It covers the customer pages (menu, cart, checkout, order tracking) and the staff pages (cashier, menu admin, sales reports, login).

See the [main README](../README.md) for the whole project, including the API it talks to (`http://localhost:5044/api`, set in `src/app/api.config.ts`).

## Commands

Run these from `frontend/`, after `npm install`.

| Command | What it does |
|---|---|
| `npm start` | Dev server at http://localhost:4200, reloads on changes. Needs the API running. |
| `npm run build` | Production build with SSR, written to `dist/frontend` |
| `npm run serve:ssr:frontend` | Serves that build at http://localhost:4000 (or `$PORT`) |
| `npm run build:demo` | Self-contained demo with no API needed, written to `dist/demo/restaurant-demo.html` |
| `npm test -- --watch=false --browsers=ChromeHeadless` | Unit tests (Karma + Jasmine, needs Chrome) |
| `npm run e2e` | End-to-end tests (Playwright, in `tests/`) |
| `npm run storybook` | Storybook at http://localhost:6006 |
| `npm run build-storybook` | Static Storybook, written to `storybook-static/` |
| `npm run test-storybook` | Storybook interaction tests, headless (after `build-storybook`) |
| `npm run chromatic` | Publish Storybook to Chromatic for visual tests (needs `CHROMATIC_PROJECT_TOKEN`) |

`npm run e2e` starts the API on a separate test database (`RestaurantDb_E2E`), the dev server and a fake Paystack, so stop your own API first. Run `npx playwright install chromium` once before the first run; the Storybook interaction tests use the same browser. The [Testing section of the main README](../README.md#testing) has the details.

## Where things are

```
src/
├── app/
│   ├── components/     customer/, cashier/, admin/ and auth/ pages, plus the presentational components
│   │                   they use (product-card, cart-line, order-summary, checkout-form, order-card, status-badge)
│   ├── services/       API calls, cart, staff sign-in, HTTP interceptors, route guard
│   ├── models/         TypeScript types that mirror the API
│   ├── app.routes.ts   routes (staff pages are guarded by role)
│   └── app.routes.server.ts   which routes render on the server
├── demo/               in-browser stand-in for the API, used by the demo build and page stories
├── stories/            shared Storybook data and demo-API setup
├── testing/            naira locale for unit tests and Storybook
├── main.ts / main.server.ts / main.demo.ts   browser, server and demo entry points
└── styles.css          theme (brand colours, fonts) on top of Bootstrap 5
tests/                  Playwright e2e tests and the fake Paystack
.storybook/             Storybook configuration
scripts/build-demo.mjs  packs the demo build into one HTML file
scripts/test-storybook.mjs  serves the Storybook build and runs the interaction tests
```
