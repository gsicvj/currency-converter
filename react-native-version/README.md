# Currency App (React Native)

React Native (Expo) version of the currency converter app. Same behavior as the PWA: multi-currency list, numeric keyboard, and live conversion using rates from the [Frankfurter API](https://www.frankfurter.app/).

## Setup

```bash
cd react-native-version
npm install
# or: pnpm install
```

## Run

- **iOS:** `npm run ios`
- **Android:** `npm run android`
- **Web:** `npm run web`
- **Dev server:** `npm start` then choose platform

## Structure

- `App.tsx` – Root with `QueryClientProvider` and `CurrencyConverter`
- `src/components/` – `CurrencyConverter`, `CurrencyList`, `Keyboard`
- `src/utils/` – `currencies`, `exchangeRates` (Frankfurter API), `format`

Rates are fetched from `https://api.frankfurter.dev/v1/latest`; on failure the app falls back to built-in default rates.
