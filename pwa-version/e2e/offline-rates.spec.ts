import { expect, test } from "@playwright/test";

const mockedRates = {
  EUR: 1,
  GBP: 0.85,
  USD: 1.08,
  KRW: 1440,
  THB: 38.5,
  ISK: 150,
  JPY: 163,
};
const mockedCurrencies = [
  { code: "EUR", name: "Euro", flag: "🇪🇺", symbol: "€" },
  { code: "GBP", name: "British Pound", flag: "🇬🇧", symbol: "£" },
  { code: "ISK", name: "Icelandic Króna", flag: "🇮🇸", symbol: "kr." },
  { code: "JPY", name: "Japanese Yen", flag: "🇯🇵", symbol: "¥" },
  { code: "KRW", name: "Korean Won", flag: "🇰🇷", symbol: "₩" },
  { code: "THB", name: "Thai Baht", flag: "🇹🇭", symbol: "฿" },
  { code: "USD", name: "United States Dollar", flag: "🇺🇸", symbol: "$" },
];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
  });
  await page.route("**/api/currencies", (route) =>
    route.fulfill({ contentType: "application/json", json: mockedCurrencies }),
  );
});

test("converts a currency added while offline from cached rates", async ({
  page,
}) => {
  const rateRequests: string[] = [];
  let isOffline = false;
  await page.route("**/api/exchange-rates**", async (route) => {
    rateRequests.push(route.request().url());
    if (isOffline) {
      await route.abort("internetdisconnected");
      return;
    }
    await route.fulfill({ contentType: "application/json", json: mockedRates });
  });

  await page.goto("/");
  await expect(page.getByText(/^Updated /)).toBeVisible();
  isOffline = true;

  await page.getByRole("button", { name: "Edit currencies" }).click();
  await page.getByRole("button", { name: "Add GBP" }).click();
  await page.getByRole("button", { name: "Done" }).click();

  await expect(page.getByRole("textbox", { name: "GBP amount" })).toHaveValue(
    "0.85",
  );
  await expect(page.getByText(/^Updated /)).toBeVisible();
  // One request covers every currency, so editing the list needs no network.
  expect(rateRequests).toHaveLength(1);
  expect(new URL(rateRequests[0]).searchParams.has("symbols")).toBe(false);
});
