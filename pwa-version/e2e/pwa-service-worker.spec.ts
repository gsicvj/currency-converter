import { expect, test } from "@playwright/test";

// The service worker only exists in production builds. Run against
// `pnpm build && pnpm start` with PLAYWRIGHT_PWA_PRODUCTION=1.
test.skip(
  process.env.PLAYWRIGHT_PWA_PRODUCTION !== "1",
  "Requires a production build",
);
test.use({ serviceWorkers: "allow" });

test("opens the app offline after a single online visit", async ({
  context,
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText(/^Updated /)).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // Rates come from the persisted query cache, written on a throttle.
  await expect
    .poll(() =>
      page.evaluate(() =>
        (
          window.localStorage.getItem("currency-app:query-cache:v1") ?? ""
        ).includes("exchangeRates"),
      ),
    )
    .toBe(true);

  await context.setOffline(true);
  await page.reload();

  await expect(page.getByRole("textbox", { name: "EUR amount" })).toBeVisible();
  await expect(page.getByText(/^Updated /)).toBeVisible();
});

test("opens offline with an edited currency list", async ({
  context,
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText(/^Updated /)).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });

  await page.getByRole("button", { name: "Edit currencies" }).click();
  await page.getByRole("button", { name: "Remove THB" }).click();
  await page.getByPlaceholder("Search currencies").fill("GBP");
  await page.getByRole("button", { name: "Add GBP" }).click();
  await page.getByRole("button", { name: "Done" }).click();
  await expect(page.getByRole("textbox", { name: "GBP amount" })).not.toHaveValue(
    "",
  );
  // Wait for the throttled writer to store the rates.
  await expect
    .poll(() =>
      page.evaluate(() =>
        (
          window.localStorage.getItem("currency-app:query-cache:v1") ?? ""
        ).includes('["exchangeRates","all"]'),
      ),
    )
    .toBe(true);

  await context.setOffline(true);
  const reopenedPage = await context.newPage();
  await page.close();
  await reopenedPage.goto("/");

  await expect(
    reopenedPage.getByRole("textbox", { name: "GBP amount" }),
  ).not.toHaveValue("");
  await expect(reopenedPage.getByText(/^Updated /)).toBeVisible();
  await expect(
    reopenedPage.getByText("Couldn't load exchange rates"),
  ).toHaveCount(0);
});
