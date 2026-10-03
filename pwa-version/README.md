# Currency Converter PWA

A Progressive Web App for currency conversion built with TanStack Start, TanStack Query, and Vite PWA plugin.

## Features

- Real-time currency conversion for 6 currencies:
  - Korean Won (KRW)
  - Thai Baht (THB)
  - American Dollar (USD)
  - Euro (EUR)
  - Icelandic Crown (ISK)
  - Japanese Yen (JPY)
- Interactive keyboard component for input
- Offline support with TanStack Query caching
- PWA capabilities with service worker
- Dark theme UI matching the design

## Tech Stack

- **Framework**: React + TanStack Router
- **State Management**: TanStack Query (React Query)
- **PWA**: vite-plugin-pwa
- **Styling**: Tailwind CSS
- **Build Tool**: Vite

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

4. Start production server:
```bash
npm start
```

## Analytics (optional)

The app can load an [Umami](https://umami.is) tracking script. It is off by
default. To enable it, copy `.env.example` to `.env` and set both values to
your own Umami instance:

```bash
VITE_UMAMI_SCRIPT_URL=https://your-umami-host/script.js
VITE_UMAMI_WEBSITE_ID=your-website-id
```

The values are read at build time, so set them in your hosting provider's
environment variables before building.

## Usage

1. Click on any currency input field to select it
2. Use the keyboard component to enter values
3. Other currencies will automatically update to show converted values
4. The app works offline thanks to PWA caching

## Project Structure

```
pwa-version/
├── src/
│   ├── components/       # React components
│   │   ├── CurrencyConverter.tsx
│   │   ├── CurrencyList.tsx
│   │   └── Keyboard.tsx
│   ├── routes/          # TanStack Router routes
│   │   ├── __root.tsx
│   │   └── index.tsx
│   ├── styles/          # CSS styles
│   │   └── app.css
│   ├── utils/           # Utility functions
│   │   ├── currencies.ts
│   │   ├── exchangeRates.ts
│   │   └── format.ts
│   ├── client.tsx        # Client entry point
│   └── router.tsx       # Router configuration
├── index.html
├── package.json
├── vite.config.ts
└── tailwind.config.js
```

## License

GPL-2.0. See [LICENSE](../LICENSE).
