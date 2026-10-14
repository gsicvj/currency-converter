import { expect, test, type Page } from "@playwright/test";

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
const nonEuroActiveCodes = ["ISK", "JPY", "KRW", "THB", "USD"];
const historyCacheKey = "currency-app:query-cache:v1";

// The chart cuts ranges by today's date, so mocked points must stay recent.
function daysAgo(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

// Euro-based history per currency, like the API route returns.
const mockedHistory: Record<string, { date: string; rate: number }[]> = {
  KRW: [
    { date: daysAgo(200), rate: 1300 },
    { date: daysAgo(20), rate: 1400 },
    { date: daysAgo(10), rate: 1420 },
    { date: daysAgo(0), rate: 1450 },
  ],
  USD: [
    { date: daysAgo(200), rate: 1 },
    { date: daysAgo(20), rate: 1 },
    { date: daysAgo(0), rate: 1.1 },
  ],
};

interface HistoryRequest {
  currency: string | null;
  span: string | null;
}

// Records each history request and answers with mocked points, or with
// a 503 while `failing` is set.
async function mockRateHistory(page: Page) {
  const state = { failing: false, requests: [] as HistoryRequest[] };

  await page.route("**/api/rate-history**", async (route) => {
    const params = new URL(route.request().url()).searchParams;
    const currency = params.get("currency");
    state.requests.push({ currency, span: params.get("span") });

    if (state.failing) {
      await route.fulfill({ status: 503, json: { error: "unavailable" } });
      return;
    }
    await route.fulfill({
      contentType: "application/json",
      json: mockedHistory[currency ?? ""] ?? [{ date: daysAgo(0), rate: 100 }],
    });
  });

  return state;
}

async function gotoConverter(page: Page) {
  const exchangeRatesLoaded = page.waitForResponse((response) =>
    response.url().includes("/api/exchange-rates"),
  );

  await page.goto("/");
  await exchangeRatesLoaded;
  await expect(page.getByText(/^Updated /)).toBeVisible();
}

function hasPreloadedEveryCurrency(requests: HistoryRequest[]) {
  return nonEuroActiveCodes.every((currency) =>
    ["1Y", "5Y"].every((span) =>
      requests.some(
        (request) => request.currency === currency && request.span === span,
      ),
    ),
  );
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
  });
  await page.route("**/api/exchange-rates**", (route) =>
    route.fulfill({ contentType: "application/json", json: mockedRates }),
  );
  await page.route("**/api/currencies", (route) =>
    route.fulfill({ contentType: "application/json", json: mockedCurrencies }),
  );
});

test("charts the selected currency against the next active currency", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockRateHistory(page);
  await gotoConverter(page);

  await page
    .getByRole("button", { name: "Charts", exact: true })
    .getByText("Charts", { exact: true })
    .click();

  const dialog = page.getByRole("dialog", { name: "Rate history" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("1 EUR = 1,450 KRW")).toBeVisible();
  await expect(dialog.getByText("+3.57%")).toBeVisible();
  await expect(
    dialog.getByRole("img", { name: "EUR to KRW exchange rate chart" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("switches the range, compared currency and direction", async ({
  page,
}) => {
  const history = await mockRateHistory(page);
  await gotoConverter(page);
  await page.getByRole("button", { name: "Charts", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Rate history" });
  await expect(dialog.getByText("+3.57%")).toBeVisible();

  // Ranges up to a year are cut from the year already loaded.
  history.failing = true;
  const yearButton = dialog.getByRole("button", { name: "1Y" });
  await yearButton.click();
  await expect(yearButton).toHaveAttribute("aria-pressed", "true");
  await expect(dialog.getByText("+11.54%")).toBeVisible();
  history.failing = false;

  await dialog.getByRole("button", { name: "5Y" }).click();
  await expect(dialog.getByText("over 5Y")).toBeVisible();
  expect(history.requests).toContainEqual({ currency: "KRW", span: "5Y" });

  const compareGroup = dialog.getByRole("group", { name: "Compare with" });
  const usdButton = compareGroup.getByRole("button", { name: "USD" });
  await usdButton.click();
  await expect(usdButton).toHaveAttribute("aria-pressed", "true");
  await expect(dialog.getByText("1 EUR = 1.1 USD")).toBeVisible();

  await dialog.getByRole("button", { name: "Swap currencies" }).click();
  await expect(dialog.getByText("1 USD = 0.909091 EUR")).toBeVisible();
  await expect(
    dialog.getByRole("img", { name: "USD to EUR exchange rate chart" }),
  ).toBeVisible();

  // Pairs without the euro divide the two euro-based histories.
  await compareGroup.getByRole("button", { name: "KRW" }).click();
  await expect(dialog.getByText("1 USD = 1,318.18 KRW")).toBeVisible();
});

test("offers a retry when rate history is unavailable", async ({ page }) => {
  const history = await mockRateHistory(page);
  history.failing = true;
  await gotoConverter(page);
  await page.getByRole("button", { name: "Charts", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Rate history" });

  await expect(dialog.getByText("Couldn't load rate history")).toBeVisible();

  history.failing = false;
  await dialog.getByRole("button", { name: "Retry" }).click();

  await expect(dialog.getByText("1 EUR = 1,450 KRW")).toBeVisible();
});

test("keeps amount keys away from the converter while open", async ({
  page,
}) => {
  await mockRateHistory(page);
  await gotoConverter(page);
  const eurAmount = page.getByRole("textbox", { name: "EUR amount" });
  await expect(eurAmount).toHaveValue("1");

  const historyButton = page.getByRole("button", { name: "Charts", exact: true });
  await historyButton.click();
  const dialog = page.getByRole("dialog", { name: "Rate history" });
  await expect(dialog).toBeVisible();

  await page.keyboard.press("7");
  await page.keyboard.press("Escape");

  await expect(dialog).toBeHidden();
  await expect(historyButton).toBeFocused();
  await expect(eurAmount).toHaveValue("1");
});

test("preloads the chart and every active currency's history in the background", async ({
  page,
}) => {
  const history = await mockRateHistory(page);
  const chartCodeLoaded = page.waitForRequest(/RateChart/);
  await gotoConverter(page);

  await chartCodeLoaded;
  await expect
    .poll(() => hasPreloadedEveryCurrency(history.requests))
    .toBe(true);

  const requestCount = history.requests.length;
  await page.getByRole("button", { name: "Charts", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Rate history" });
  await expect(dialog.getByText("1 EUR = 1,450 KRW")).toBeVisible();
  await dialog.getByRole("button", { name: "5Y" }).click();
  await expect(dialog.getByText("over 5Y")).toBeVisible();
  expect(history.requests).toHaveLength(requestCount);
});

test("shows cached history offline on the next app load", async ({
  context,
  page,
}) => {
  const history = await mockRateHistory(page);
  await gotoConverter(page);
  await expect
    .poll(() => hasPreloadedEveryCurrency(history.requests))
    .toBe(true);
  // Wait for the throttled cache writer to store the history.
  await expect
    .poll(() =>
      page.evaluate((key) => {
        const cache = JSON.parse(window.localStorage.getItem(key) ?? "null");
        const queries: { queryKey: unknown[] }[] =
          cache?.clientState.queries ?? [];

        return queries.filter((query) => query.queryKey[0] === "rateHistory")
          .length;
      }, historyCacheKey),
    )
    .toBe(nonEuroActiveCodes.length * 2);

  // A new page skips the beforeEach localStorage reset, like reopening the PWA.
  const nextPage = await context.newPage();
  const apiRequests: string[] = [];
  await nextPage.route("**/api/**", async (route) => {
    apiRequests.push(route.request().url());
    await route.abort();
  });

  await nextPage.goto("/");
  await expect(nextPage.getByText(/^Updated /)).toBeVisible();
  await nextPage.getByRole("button", { name: "Charts", exact: true }).click();
  const dialog = nextPage.getByRole("dialog", { name: "Rate history" });
  await expect(dialog.getByText("1 EUR = 1,450 KRW")).toBeVisible();
  expect(apiRequests).toEqual([]);
});
