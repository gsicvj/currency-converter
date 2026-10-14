# Currency Converter

Multi-currency converter Progressive Web App with live rates from the
[Frankfurter API](https://frankfurter.dev), built with TanStack Start,
TanStack Query, and Vite.

**Live demo:** [currency.domenurh.com](https://currency.domenurh.com)

## Features

- Converts between every currency Frankfurter publishes. Starts with KRW,
  THB, USD, EUR, ISK and JPY.
- Type on the on-screen keypad or a physical keyboard. Digits, `.` or `,`,
  `Backspace`, `C` or `Delete` to clear, and `S` to swap the selected
  currency.
- Edit the currency list: search, add, remove with undo, and reorder by drag
  or with the arrow keys. The list and its order are saved in `localStorage`.
- Rate history charts for any pair of your currencies over 1W, 1M, 3M, 1Y or
  5Y, with the change over the range.
- Refresh rates from the header button or with pull-to-refresh. The header
  shows when the rates were last updated.
- Works offline. A service worker caches the app shell, and the last
  currencies, rates and rate history stay in `localStorage` for 7 days.
- Installable on phones and desktops through the web app manifest.

## Tech Stack

- **Framework:** React 19, TanStack Start and TanStack Router
- **Data:** TanStack Query, persisted to `localStorage`
- **Server:** Nitro. API routes proxy Frankfurter and cache responses in
  memory.
- **Offline:** Workbox service worker, generated at build time by
  `scripts/serviceWorkerPlugin.ts`
- **Charts:** Chart.js
- **Styling:** Tailwind CSS 4
- **Tests:** Vitest and Playwright (Chromium)

## Getting Started

The project uses [pnpm](https://pnpm.io).

```bash
pnpm install
pnpm dev        # http://localhost:3000
```

Production build:

```bash
pnpm build
pnpm start      # serves .output/server/index.mjs
```

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the Vite dev server on port 3000 |
| `pnpm build` | Build the app and service worker into `.output/` |
| `pnpm start` | Run the production server |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | Run the TypeScript compiler without output |
| `pnpm test` | Run the Vitest unit tests |
| `pnpm test:e2e` | Run the Playwright tests |
| `pnpm test:e2e:install` | Install the Playwright Chromium browser |

## Testing

Unit tests sit next to the code they test as `*.test.ts` files.

Playwright tests live in `e2e/`. By default, `pnpm test:e2e` starts
`pnpm dev` on port 3000, or reuses a server that already listens there. To
test against a different server, set `PLAYWRIGHT_BASE_URL`:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:4000 pnpm test:e2e
```

The service worker exists only in production builds, so its tests are
skipped by default. To run them, start a production server and set
`PLAYWRIGHT_PWA_PRODUCTION=1`:

```bash
pnpm build
PORT=4000 pnpm start
PLAYWRIGHT_PWA_PRODUCTION=1 PLAYWRIGHT_BASE_URL=http://localhost:4000 pnpm test:e2e
```

## Analytics (optional)

The app can load an [Umami](https://umami.is) tracking script. It is off by
default. To enable it, copy `.env.example` to `.env` and set both values to
your own Umami instance:

```bash
VITE_UMAMI_SCRIPT_URL=https://your-umami-host/script.js
VITE_UMAMI_WEBSITE_ID=your-website-id
# Optional: record only on these comma-separated hostnames
VITE_UMAMI_DOMAINS=your-app.example.com
```

The values are read at build time, so set them in your hosting provider's
environment variables before building.

## Project Structure

```
currency-converter/
├── e2e/                    # Playwright tests
├── public/                 # Icons and web app manifest
├── scripts/
│   └── serviceWorkerPlugin.ts  # Generates the service worker at build time
├── src/
│   ├── components/
│   │   ├── CurrencyConverter.tsx  # Converter screen
│   │   ├── converter/      # Header, currency list, keypad, amount actions
│   │   ├── editor/         # Currency editor sheet
│   │   ├── history/        # Rate history sheet and chart
│   │   └── ui/             # Shared UI: sheet, toast, logo
│   ├── hooks/              # Converter state and behavior hooks
│   ├── routes/
│   │   ├── __root.tsx      # HTML shell, query cache, analytics
│   │   ├── index.tsx       # Converter page
│   │   └── api/            # Server routes: currencies, rates, history
│   ├── styles/globals.css
│   ├── utils/              # Conversion, formatting, data fetching, storage
│   └── router.tsx
├── package.json
├── playwright.config.ts
├── vite.config.ts
└── vitest.config.ts
```

## License

GPL-2.0. See [LICENSE](LICENSE).
