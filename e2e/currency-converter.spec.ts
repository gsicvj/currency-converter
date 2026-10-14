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
const currencyPreferencesStorageKey = "currency-app:currency-preferences:v1";
const ratesUpdatedText = /^Updated /;

// Waits for entrance animations so measured boxes match final positions.
// Infinite animations such as the refresh spinner never finish, so skip them.
async function settleAnimations(page: Page) {
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter(
          (animation) =>
            animation.effect?.getTiming().iterations !== Infinity,
        )
        .map((animation) => animation.finished),
    ),
  );
}

async function gotoConverter(page: Page) {
  const exchangeRatesLoaded = page.waitForResponse((response) =>
    response.url().includes("/api/exchange-rates"),
  );

  await page.goto("/");
  await exchangeRatesLoaded;
  await expect(page.getByText(ratesUpdatedText)).toBeVisible();
  await settleAnimations(page);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
  });

  await page.route("**/api/exchange-rates**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: mockedRates,
    });
  });

  await page.route("**/api/currencies", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: mockedCurrencies,
    });
  });
});

test.describe("touch tablet layout", () => {
  test.use({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 1024, height: 600 },
  });

  test("keeps the keypad visible and the currency list scrollable after adding a currency", async ({
    page,
  }) => {
    await gotoConverter(page);

    await page.getByRole("button", { name: "Edit currencies" }).click();
    await page.getByPlaceholder("Search currencies").fill("GBP");
    await page.getByRole("button", { name: "Add GBP" }).click();
    await page.getByRole("button", { name: "Done" }).click();

    const keypad = page.getByRole("group", { name: "Currency keypad" });
    const gbpAmount = page.getByRole("textbox", { name: "GBP amount" });
    const currencyScroller = page.getByRole("region", {
      name: "Currency amounts",
    });
    await gbpAmount.click();

    await expect(keypad).toBeVisible();
    await expect
      .poll(() =>
        currencyScroller.evaluate(
          (element) => element.scrollHeight > element.clientHeight,
        ),
      )
      .toBe(true);

    const keypadBox = await keypad.boundingBox();
    const currencyScrollerBox = await currencyScroller.boundingBox();
    const gbpAmountBox = await gbpAmount.boundingBox();
    expect(keypadBox).not.toBeNull();
    expect(currencyScrollerBox).not.toBeNull();
    expect(gbpAmountBox).not.toBeNull();
    expect((keypadBox?.y ?? 0) + (keypadBox?.height ?? 0)).toBeLessThanOrEqual(
      600,
    );
    expect(gbpAmountBox?.y).toBeGreaterThanOrEqual(currencyScrollerBox?.y ?? 0);
    expect(
      (gbpAmountBox?.y ?? 0) + (gbpAmountBox?.height ?? 0),
    ).toBeLessThanOrEqual(
      (currencyScrollerBox?.y ?? 0) + (currencyScrollerBox?.height ?? 0),
    );

    await page.getByRole("button", { name: "2", exact: true }).click();
    await page.getByRole("button", { name: "5", exact: true }).click();
    await expect(gbpAmount).toHaveValue("25");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });

  test("keeps the keypad in the viewport when swiping over it", async ({
    page,
  }) => {
    await gotoConverter(page);

    const keypad = page.getByRole("group", { name: "Currency keypad" });
    const keypadBox = await keypad.boundingBox();
    expect(keypadBox).not.toBeNull();
    const x = (keypadBox?.x ?? 0) + (keypadBox?.width ?? 0) / 2;
    const startY = (keypadBox?.y ?? 0) + 10;

    // Mobile Safari scrolls or rubber-bands the document on swipes that start
    // outside a scroll container, so the page itself must refuse to pan.
    expect(
      await page.evaluate(() => {
        const html = getComputedStyle(document.documentElement);
        const body = getComputedStyle(document.body);
        return {
          htmlOverflow: html.overflowY,
          htmlOverscroll: html.overscrollBehaviorY,
          bodyOverflow: body.overflowY,
          bodyOverscroll: body.overscrollBehaviorY,
          keypadTouchAction: getComputedStyle(
            document.querySelector('[aria-label="Currency keypad"]')!,
          ).touchAction,
        };
      }),
    ).toEqual({
      htmlOverflow: "hidden",
      htmlOverscroll: "none",
      bodyOverflow: "hidden",
      bodyOverscroll: "none",
      keypadTouchAction: "none",
    });

    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.synthesizeScrollGesture", {
      x,
      y: startY,
      yDistance: -300,
      gestureSourceType: "touch",
    });
    await cdp.send("Input.synthesizeScrollGesture", {
      x,
      y: startY,
      yDistance: 300,
      gestureSourceType: "touch",
    });

    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    const keypadBoxAfter = await keypad.boundingBox();
    expect(
      (keypadBoxAfter?.y ?? 0) + (keypadBoxAfter?.height ?? 0),
    ).toBeLessThanOrEqual(600);
    await expect(page.getByRole("button", { name: "0", exact: true })).toBeInViewport();
  });
});

test("renders the PWA converter and accepts keypad input in Chromium", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoConverter(page);
  await expect(page.getByLabel("Currency keypad")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Refresh exchange rates" }),
  ).toBeVisible();

  const eurAmount = page.locator("input").nth(3);
  await expect(eurAmount).toHaveValue("1");

  await page.getByRole("button", { name: "Clear amount" }).click();
  await page.getByRole("button", { name: "1" }).click();
  await page.getByRole("button", { name: "2" }).click();
  await page.getByRole("button", { name: "3" }).click();

  await expect(eurAmount).toHaveValue("123");
});

test("does not report hydration mismatches on first render", async ({
  page,
}) => {
  const hydrationErrors: string[] = [];
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      /hydration|hydrated|server rendered HTML didn't match/i.test(
        message.text(),
      )
    ) {
      hydrationErrors.push(message.text());
    }
  });

  await gotoConverter(page);

  expect(hydrationErrors).toEqual([]);
});

test("renders saved currency order from the first paint on reload", async ({
  page,
}) => {
  const savedCodes = ["USD", "KRW", "EUR"];
  await page.addInitScript(
    ({ storageKey, activeCodes }) => {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({ activeCodes, selectedCode: "USD" }),
      );

      // Records every distinct row order the page shows, starting with
      // the server-rendered HTML.
      const seenOrders: string[][] = [];
      (window as unknown as { seenOrders: string[][] }).seenOrders =
        seenOrders;
      new MutationObserver(() => {
        const codes = Array.from(
          document.querySelectorAll<HTMLInputElement>("[data-currency-code]"),
          (input) => input.dataset.currencyCode ?? "",
        );
        const lastOrder = seenOrders.at(-1);
        if (codes.length > 0 && codes.join() !== lastOrder?.join()) {
          seenOrders.push(codes);
        }
      }).observe(document, { childList: true, subtree: true });
    },
    { storageKey: currencyPreferencesStorageKey, activeCodes: savedCodes },
  );

  await gotoConverter(page);
  await page.reload();
  await expect(page.getByText(ratesUpdatedText)).toBeVisible();

  const seenOrders = await page.evaluate(
    () => (window as unknown as { seenOrders: string[][] }).seenOrders,
  );
  expect(seenOrders).toEqual([savedCodes]);
});

async function holdRefreshedRates(page: Page) {
  const refreshUrls: string[] = [];
  let releaseRefresh: () => void = () => {};
  const refreshCanFinish = new Promise<void>((resolve) => {
    releaseRefresh = resolve;
  });

  await page.route("**/api/exchange-rates**", async (route) => {
    const url = route.request().url();

    if (!url.includes("refresh=1")) {
      await route.fulfill({
        contentType: "application/json",
        json: mockedRates,
      });
      return;
    }

    refreshUrls.push(url);
    await refreshCanFinish;
    await route.fulfill({
      contentType: "application/json",
      json: { ...mockedRates, USD: 1.09 },
    });
  });

  return { refreshUrls, releaseRefresh };
}

test("refreshes fresh rates in the background from the refresh button", async ({
  page,
}) => {
  const { refreshUrls, releaseRefresh } = await holdRefreshedRates(page);
  await gotoConverter(page);
  const refreshButton = page.getByRole("button", {
    name: "Refresh exchange rates",
  });

  await refreshButton.click();
  await expect.poll(() => refreshUrls.length).toBe(1);

  await expect(page.getByText(ratesUpdatedText)).toBeVisible();
  await expect(page.getByText("Loading exchange rates...")).toHaveCount(0);
  await expect(refreshButton.locator("svg")).toHaveClass(/animate-spin/);

  releaseRefresh();
  await expect(page.getByRole("textbox", { name: "USD amount" })).toHaveValue(
    "1.09",
  );
  await expect(refreshButton.locator("svg")).not.toHaveClass(/animate-spin/);
});

test.describe("pull to refresh", () => {
  test.use({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });

  test("refreshes rates when the currency list is pulled down", async ({
    page,
  }) => {
    const { refreshUrls, releaseRefresh } = await holdRefreshedRates(page);
    await gotoConverter(page);

    const client = await page.context().newCDPSession(page);
    const touch = (type: "touchStart" | "touchMove" | "touchEnd", y: number) =>
      client.send("Input.dispatchTouchEvent", {
        type,
        touchPoints: type === "touchEnd" ? [] : [{ x: 195, y }],
      });
    await touch("touchStart", 150);
    for (let y = 170; y <= 350; y += 20) {
      await touch("touchMove", y);
    }
    await expect(page.getByText("Release to refresh")).toBeVisible();
    await touch("touchEnd", 350);

    await expect.poll(() => refreshUrls.length).toBe(1);
    await expect(page.getByText(ratesUpdatedText)).toBeVisible();
    releaseRefresh();
    await expect(page.getByRole("textbox", { name: "USD amount" })).toHaveValue(
      "1.09",
    );
  });

  test("ignores short pulls", async ({ page }) => {
    const { refreshUrls } = await holdRefreshedRates(page);
    await gotoConverter(page);

    const client = await page.context().newCDPSession(page);
    await client.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: 195, y: 150 }],
    });
    await client.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: 195, y: 190 }],
    });
    await client.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });

    await page.waitForTimeout(300);
    expect(refreshUrls).toEqual([]);
  });

  test("springs the pull indicator back after release", async ({ page }) => {
    await gotoConverter(page);

    const client = await page.context().newCDPSession(page);
    await client.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: 195, y: 150 }],
    });
    await client.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: 195, y: 230 }],
    });
    const indicator = page
      .getByText("Pull to refresh")
      .locator("xpath=parent::*");
    await expect(indicator).toBeVisible();
    await client.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });

    // Eases back to zero height instead of vanishing on release.
    expect(
      await indicator.evaluate(
        (element) => getComputedStyle(element).transitionProperty,
      ),
    ).toContain("height");
    await expect
      .poll(() => indicator.evaluate((element) => element.clientHeight))
      .toBe(0);
  });
});

test("shows the app logo before the rates status", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoConverter(page);

  const logo = page.getByRole("img", { name: "Currency" });
  await expect(logo).toBeVisible();
  const logoBox = await logo.boundingBox();
  const statusBox = await page.getByText(ratesUpdatedText).boundingBox();
  expect((logoBox?.x ?? 0) + (logoBox?.width ?? 0)).toBeLessThanOrEqual(
    statusBox?.x ?? 0,
  );
});

test("centers the rates status in the header", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoConverter(page);

  const headerBox = await page.locator("header").boundingBox();
  const statusBox = await page.getByText(ratesUpdatedText).boundingBox();
  const headerCenter = (headerBox?.x ?? 0) + (headerBox?.width ?? 0) / 2;
  const statusCenter = (statusBox?.x ?? 0) + (statusBox?.width ?? 0) / 2;
  expect(Math.abs(statusCenter - headerCenter)).toBeLessThan(1);
});

test("takes its accent colors from the logo", async ({ page }) => {
  await gotoConverter(page);

  // Logo gradient runs from #72cd75 to #077d99.
  await expect(
    page.getByRole("button", { name: "Edit currencies" }),
  ).toHaveCSS("color", "rgb(114, 205, 117)");
});

test("centers the converter on tablet portrait viewports", async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 1180 });
  await gotoConverter(page);

  const firstAmount = page.locator("input").first();
  const keypad = page.getByLabel("Currency keypad");
  await expect(firstAmount).toBeVisible();
  await expect(keypad).toBeVisible();

  const firstAmountBox = await firstAmount.boundingBox();
  const keypadBox = await keypad.boundingBox();

  expect(firstAmountBox?.x).toBeGreaterThan(80);
  expect(firstAmountBox?.width).toBeLessThan(650);
  expect(keypadBox?.y).toBeGreaterThan(firstAmountBox?.y ?? 0);
});

test("styles the converter shell as a unit off mobile", async ({ page }) => {
  const converterShell = page.getByRole("main");

  await page.setViewportSize({ width: 390, height: 844 });
  await gotoConverter(page);
  await expect(converterShell).toHaveCSS("border-top-left-radius", "0px");
  await expect(converterShell).toHaveCSS(
    "background-color",
    "rgba(0, 0, 0, 0)",
  );

  await page.setViewportSize({ width: 820, height: 1180 });
  await expect(converterShell).toHaveCSS("border-top-left-radius", "16px");
  await expect(converterShell).toHaveCSS("background-color", "rgb(15, 27, 30)");

  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(converterShell).toHaveCSS("border-top-left-radius", "16px");
  await expect(converterShell).toHaveCSS("background-color", "rgb(15, 27, 30)");
});

test("keeps the tablet keypad on the converter bottom border", async ({
  page,
}) => {
  await page.setViewportSize({ width: 820, height: 1180 });
  await gotoConverter(page);

  const converterShell = page.getByRole("main");
  const keypad = page.getByLabel("Currency keypad");
  await expect(keypad).toBeVisible();
  await expect(keypad).toHaveCSS("border-bottom-left-radius", "16px");
  await expect(keypad).toHaveCSS("border-bottom-right-radius", "16px");

  const shellBox = await converterShell.boundingBox();
  const keypadBox = await keypad.boundingBox();

  expect(shellBox).not.toBeNull();
  expect(keypadBox).not.toBeNull();
  expect(
    Math.abs(
      (keypadBox?.y ?? 0) +
        (keypadBox?.height ?? 0) -
        ((shellBox?.y ?? 0) + (shellBox?.height ?? 0)),
    ),
  ).toBeLessThan(1);
});

test("hides the keypad on desktop viewports", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoConverter(page);

  const firstAmount = page.locator("input").first();
  const firstCurrencyRow = firstAmount.locator("xpath=ancestor::li");
  const keypad = page.getByLabel("Currency keypad");
  await expect(firstAmount).toBeVisible();
  await expect(keypad).toBeHidden();

  const rowBox = await firstCurrencyRow.boundingBox();
  expect(rowBox).not.toBeNull();
  expect(
    Math.abs((rowBox?.x ?? 0) + (rowBox?.width ?? 0) / 2 - 640),
  ).toBeLessThan(4);
});

test("offers clear, delete and swap buttons when the keypad is hidden on desktop", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoConverter(page);

  const eurAmount = page.locator("input").nth(3);
  await expect(eurAmount).toHaveValue("1");
  await expect(page.getByLabel("Currency keypad")).toBeHidden();

  const actions = page.getByRole("group", { name: "Amount actions" });
  await expect(actions).toBeVisible();

  await page.keyboard.press("c");
  for (const key of ["1", "2", "5"]) {
    await page.keyboard.press(key);
  }
  await expect(eurAmount).toHaveValue("125");

  await actions.getByRole("button", { name: "Delete last digit" }).click();
  await expect(eurAmount).toHaveValue("12");

  await actions.getByRole("button", { name: "Clear amount" }).click();
  await expect(eurAmount).toHaveValue("0");

  await expect(
    actions.getByRole("button", { name: "Swap selected currency" }),
  ).toBeVisible();
});

test("hides the desktop amount actions while the keypad is shown", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoConverter(page);

  await expect(page.getByLabel("Currency keypad")).toBeVisible();
  await expect(page.getByRole("group", { name: "Amount actions" })).toBeHidden();
});

test("keeps the desktop amount cursor where the input is clicked", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoConverter(page);

  const eurAmount = page.locator("input").nth(3);
  await expect(eurAmount).toHaveValue("1");

  await page.keyboard.press("c");
  for (const key of ["1", "2", "3", "4", "5"]) {
    await page.keyboard.press(key);
  }

  const amountBox = await eurAmount.boundingBox();
  expect(amountBox).not.toBeNull();

  await eurAmount.click({
    position: {
      x: (amountBox?.width ?? 0) / 2,
      y: (amountBox?.height ?? 0) / 2,
    },
  });

  const selectionStart = await eurAmount.evaluate(
    (input) => (input as HTMLInputElement).selectionStart,
  );

  expect(selectionStart).toBeLessThan(5);
});

test("deletes at the desktop amount cursor instead of the end", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoConverter(page);

  const eurAmount = page.locator("input").nth(3);
  await expect(eurAmount).toHaveValue("1");

  await page.keyboard.press("c");
  for (const key of ["1", "2", "3", ".", "1", "2"]) {
    await page.keyboard.press(key);
  }
  await expect(eurAmount).toHaveValue("123.12");

  await eurAmount.focus();
  await eurAmount.evaluate((input) => {
    (input as HTMLInputElement).setSelectionRange(2, 2);
  });
  await page.keyboard.press("Backspace");

  await expect(eurAmount).toHaveValue("13.12");
  await expect
    .poll(() =>
      eurAmount.evaluate((input) => (input as HTMLInputElement).selectionStart),
    )
    .toBe(1);
});

test("floats the keyboard toggle in the bottom key row", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoConverter(page);

  const hideKeyboardButton = page.getByRole("button", {
    name: "Hide keyboard",
  });
  const zeroButton = page.getByRole("button", { name: "0", exact: true });
  const hideBox = await hideKeyboardButton.boundingBox();
  const zeroBox = await zeroButton.boundingBox();

  // Shares the last key row instead of adding a row of its own.
  expect(hideBox?.y).toBe(zeroBox?.y);
  expect(hideBox?.height).toBe(zeroBox?.height);

  // The toggle sits above the keys, so its centre hits the toggle itself.
  const topElementLabel = () =>
    page.evaluate(() => {
      const button = document.querySelector<HTMLElement>(
        '[aria-controls="keypad-keys"]',
      )!;
      const box = button.getBoundingClientRect();
      return document
        .elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)
        ?.closest("button")
        ?.getAttribute("aria-label");
    });
  expect(await topElementLabel()).toBe("Hide keyboard");

  await hideKeyboardButton.click();
  await settleAnimations(page);

  // Collapsed, only the button remains; the list runs behind it.
  const showBox = await page
    .getByRole("button", { name: "Show keyboard" })
    .boundingBox();
  const scrollerBox = await page
    .getByRole("region", { name: "Currency amounts" })
    .boundingBox();
  expect(showBox?.width).toBeLessThan(390 / 2);
  expect(
    (scrollerBox?.y ?? 0) + (scrollerBox?.height ?? 0),
  ).toBeGreaterThan((showBox?.y ?? 0) + (showBox?.height ?? 0));
  expect(await topElementLabel()).toBe("Show keyboard");
});

test("toggles the keypad from the lower-right keyboard control", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoConverter(page);

  await expect(page.getByLabel("Currency keypad")).toBeVisible();
  await expect(page.getByRole("button", { name: "7" })).toBeVisible();

  const hideKeyboardButton = page.getByRole("button", {
    name: "Hide keyboard",
  });
  const deleteLastDigitButton = page.getByRole("button", {
    name: "Delete last digit",
  });
  await expect(deleteLastDigitButton).toBeVisible();

  const hideKeyboardBox = await hideKeyboardButton.boundingBox();
  const deleteLastDigitBox = await deleteLastDigitButton.boundingBox();

  // Bottom-right corner, in the same column as the delete key.
  expect(hideKeyboardBox?.x).toBe(deleteLastDigitBox?.x);
  expect(hideKeyboardBox?.y).toBeGreaterThan(deleteLastDigitBox?.y ?? 0);

  await hideKeyboardButton.click();

  await expect(page.getByRole("button", { name: "7" })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Show keyboard" }),
  ).toBeVisible();

  const showKeyboardButton = page.getByRole("button", {
    name: "Show keyboard",
  });
  const showKeyboardBox = await showKeyboardButton.boundingBox();

  expect(showKeyboardBox?.x).toBe(hideKeyboardBox?.x);
  expect(showKeyboardBox?.height).toBe(hideKeyboardBox?.height);

  await showKeyboardButton.click();

  await expect(page.getByRole("button", { name: "7" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Hide keyboard" }),
  ).toBeVisible();
});

test("edits currencies in one keyboard-friendly sheet", async ({ page }) => {
  await gotoConverter(page);

  await expect(page.getByRole("button", { name: "Add currency" })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("button", { name: "Manage currencies" }),
  ).toHaveCount(0);

  const editButton = page.getByRole("button", { name: "Edit currencies" });
  await editButton.click();

  const dialog = page.getByRole("dialog", { name: "Edit currencies" });
  await expect(dialog).toBeVisible();
  await expect(page.getByPlaceholder("Search currencies")).toBeFocused();
  await expect(
    dialog.getByRole("button", { name: "Remove KRW" }),
  ).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Add GBP" })).toBeVisible();

  await page.keyboard.press("Escape");

  await expect(dialog).toBeHidden();
  await expect(editButton).toBeFocused();
});

test("adds several currencies without closing the sheet", async ({ page }) => {
  await gotoConverter(page);
  await page.getByRole("button", { name: "Edit currencies" }).click();
  const dialog = page.getByRole("dialog", { name: "Edit currencies" });

  await page.getByPlaceholder("Search currencies").fill("pound");
  await dialog.getByRole("button", { name: "Add GBP" }).click();

  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Added", { exact: true })).toBeVisible();
  await expect(dialog.getByRole("status")).toHaveText("GBP added");

  await page.getByPlaceholder("Search currencies").fill("");
  await expect(
    dialog.getByRole("button", { name: "Remove GBP" }),
  ).toBeVisible();

  await dialog.getByRole("button", { name: "Done" }).click();
  await expect(dialog).toBeHidden();
  // The selected EUR amount converts into the new row.
  await expect(page.getByRole("textbox", { name: "GBP amount" })).toHaveValue(
    "0.85",
  );
  await expect(page.getByRole("textbox", { name: "EUR amount" })).toHaveValue(
    "1",
  );
});

test("keeps the rates timestamp while rates load for a new currency", async ({
  page,
}) => {
  await gotoConverter(page);
  let releaseRates: () => void = () => {};
  const ratesCanFinish = new Promise<void>((resolve) => {
    releaseRates = resolve;
  });
  await page.route("**/api/exchange-rates**", async (route) => {
    await ratesCanFinish;
    await route.fulfill({ contentType: "application/json", json: mockedRates });
  });

  await page.getByRole("button", { name: "Edit currencies" }).click();
  await page.getByRole("button", { name: "Add GBP" }).click();
  await page.getByRole("button", { name: "Done" }).click();

  await expect(page.getByText("Loading exchange rates...")).toHaveCount(0);
  await expect(page.getByText(ratesUpdatedText)).toBeVisible();
  releaseRates();
  await expect(page.getByRole("textbox", { name: "GBP amount" })).toHaveValue(
    "0.85",
  );
});

test("removes a currency with undo", async ({ page }) => {
  await gotoConverter(page);
  await page.getByRole("button", { name: "Edit currencies" }).click();
  const dialog = page.getByRole("dialog", { name: "Edit currencies" });

  await dialog.getByRole("button", { name: "Remove THB" }).click();
  await expect(dialog.getByRole("button", { name: "Remove THB" })).toHaveCount(
    0,
  );

  const undoButton = page.getByRole("button", { name: "Undo" });
  await expect(page.getByText("THB removed")).toBeVisible();
  await undoButton.click();

  await expect(page.getByText("THB removed")).toHaveCount(0);
  await expect(
    page.locator("button[aria-label^='Drag']").nth(1),
  ).toHaveAttribute("aria-label", "Drag THB to reorder");
});

test("reorders currencies with arrow keys on the drag handle", async ({
  page,
}) => {
  await gotoConverter(page);
  await page.getByRole("button", { name: "Edit currencies" }).click();

  const krwHandle = page.getByRole("button", { name: "Drag KRW to reorder" });
  await krwHandle.focus();
  await page.keyboard.press("ArrowDown");

  const handles = page.locator("button[aria-label^='Drag']");
  await expect(handles.nth(1)).toHaveAttribute(
    "aria-label",
    "Drag KRW to reorder",
  );
  await expect(krwHandle).toBeFocused();

  await page.keyboard.press("ArrowUp");
  await expect(handles.first()).toHaveAttribute(
    "aria-label",
    "Drag KRW to reorder",
  );
  await expect(krwHandle).toBeFocused();
});

async function openEditorWithSavedOrder(page: Page) {
  await gotoConverter(page);
  await page.waitForFunction(
    (storageKey) => window.localStorage.getItem(storageKey) !== null,
    currencyPreferencesStorageKey,
  );
  await page.getByRole("button", { name: "Edit currencies" }).click();
  const dialog = page.getByRole("dialog", { name: "Edit currencies" });
  await expect(dialog).toBeVisible();
  await settleAnimations(page);
  return dialog;
}

function dragHandleOrder(page: Page) {
  return page
    .locator("button[aria-label^='Drag']")
    .evaluateAll((handles) =>
      handles.map((handle) => handle.getAttribute("data-drag-handle")),
    );
}

test("reorders currencies by dragging with a real mouse", async ({ page }) => {
  await openEditorWithSavedOrder(page);
  expect(await dragHandleOrder(page)).toEqual([
    "KRW",
    "THB",
    "USD",
    "EUR",
    "ISK",
    "JPY",
  ]);

  const krwHandle = page.getByRole("button", { name: "Drag KRW to reorder" });
  const usdRow = page
    .getByRole("button", { name: "Drag USD to reorder" })
    .locator("xpath=ancestor::li[1]");
  const krwBox = (await krwHandle.boundingBox())!;
  const usdBox = (await usdRow.boundingBox())!;
  const x = krwBox.x + krwBox.width / 2;

  await page.mouse.move(x, krwBox.y + krwBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(x, usdBox.y + usdBox.height / 2 + 4, { steps: 12 });

  // While dragging, the row itself lifts and follows the pointer, and the
  // rows it passes slide out of the way. No duplicate ghost rows appear.
  const draggedRow = krwHandle.locator("xpath=ancestor::li[1]");
  await expect(draggedRow).toBeVisible();
  await expect(draggedRow).toHaveAttribute("data-dragging", "");
  await expect(page.getByRole("separator")).toHaveCount(0);
  expect(await page.locator("li[data-dragging]").count()).toBe(1);

  await page.mouse.up();

  await expect
    .poll(() => dragHandleOrder(page))
    .toEqual(["THB", "USD", "KRW", "EUR", "ISK", "JPY"]);
  await expect(page.locator("li[data-dragging]")).toHaveCount(0);
});

test("slides neighbouring rows aside while dragging", async ({ page }) => {
  await openEditorWithSavedOrder(page);

  const krwHandle = page.getByRole("button", { name: "Drag KRW to reorder" });
  const thbRow = page
    .getByRole("button", { name: "Drag THB to reorder" })
    .locator("xpath=ancestor::li[1]");
  const usdRow = page
    .getByRole("button", { name: "Drag USD to reorder" })
    .locator("xpath=ancestor::li[1]");
  const krwBox = (await krwHandle.boundingBox())!;
  const thbBox = (await thbRow.boundingBox())!;
  const x = krwBox.x + krwBox.width / 2;
  const translateY = (row: typeof thbRow) =>
    row.evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).m42);

  await page.mouse.move(x, krwBox.y + krwBox.height / 2);
  await page.mouse.down();
  // Just past THB's middle: THB slides up into KRW's old slot, USD stays.
  await page.mouse.move(x, krwBox.y + krwBox.height / 2 + thbBox.height * 0.6, {
    steps: 6,
  });
  await settleAnimations(page);

  expect(await translateY(thbRow)).toBeCloseTo(-thbBox.height, 0);
  expect(await translateY(usdRow)).toBe(0);

  // Moving back over the original slot puts THB back.
  await page.mouse.move(x, krwBox.y + krwBox.height / 2, { steps: 6 });
  await settleAnimations(page);
  expect(await translateY(thbRow)).toBe(0);

  await page.mouse.up();
  expect(await dragHandleOrder(page)).toEqual([
    "KRW",
    "THB",
    "USD",
    "EUR",
    "ISK",
    "JPY",
  ]);
});

test("reorders currencies with touch dragging on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const dialog = await openEditorWithSavedOrder(page);

  const krwDragHandle = page.getByRole("button", {
    name: "Drag KRW to reorder",
  });
  const krwBox = (await krwDragHandle.boundingBox())!;
  const thbRowBox = (await page
    .getByRole("button", { name: "Drag THB to reorder" })
    .locator("xpath=ancestor::li[1]")
    .boundingBox())!;
  const pointer = {
    pointerId: 1,
    pointerType: "touch",
    isPrimary: true,
    clientX: krwBox.x + krwBox.width / 2,
  };
  const startY = krwBox.y + krwBox.height / 2;

  await krwDragHandle.dispatchEvent("pointerdown", {
    ...pointer,
    button: 0,
    buttons: 1,
    clientY: startY,
  });
  await dialog.dispatchEvent("pointermove", {
    ...pointer,
    buttons: 1,
    clientY: startY + thbRowBox.height * 0.6,
  });
  await expect(
    krwDragHandle.locator("xpath=ancestor::li[1]"),
  ).toHaveAttribute("data-dragging", "");

  await dialog.dispatchEvent("pointerup", {
    ...pointer,
    button: 0,
    buttons: 0,
    clientY: startY + thbRowBox.height * 0.6,
  });

  await expect
    .poll(() => dragHandleOrder(page))
    .toEqual(["THB", "KRW", "USD", "EUR", "ISK", "JPY"]);
});

test("cancelled touch drag keeps the original order", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const dialog = await openEditorWithSavedOrder(page);

  const krwDragHandle = page.getByRole("button", {
    name: "Drag KRW to reorder",
  });
  const krwBox = (await krwDragHandle.boundingBox())!;
  const pointer = {
    pointerId: 1,
    pointerType: "touch",
    isPrimary: true,
    clientX: krwBox.x + krwBox.width / 2,
  };

  await krwDragHandle.dispatchEvent("pointerdown", {
    ...pointer,
    button: 0,
    buttons: 1,
    clientY: krwBox.y,
  });
  await dialog.dispatchEvent("pointermove", {
    ...pointer,
    buttons: 1,
    clientY: krwBox.y + 150,
  });
  await dialog.dispatchEvent("pointercancel", pointer);

  await expect(page.locator("li[data-dragging]")).toHaveCount(0);
  expect(await dragHandleOrder(page)).toEqual([
    "KRW",
    "THB",
    "USD",
    "EUR",
    "ISK",
    "JPY",
  ]);
});

test("accepts physical keyboard amount input", async ({ page }) => {
  await gotoConverter(page);

  const eurAmount = page.locator("input").nth(3);
  await expect(eurAmount).toHaveValue("1");

  await page.keyboard.press("c");
  await page.keyboard.press("1");
  await page.keyboard.press("2");
  await page.keyboard.press("3");
  await page.keyboard.press("Backspace");
  await page.keyboard.press(".");
  await page.keyboard.press("4");

  await expect(eurAmount).toHaveValue("12.4");
});

test("replaces amount on first physical digit after selecting a currency row", async ({
  page,
}) => {
  await gotoConverter(page);

  const usdAmount = page.locator("input").nth(2);
  await expect(usdAmount).toHaveValue("1.08");

  await page.getByText("USD").click();
  await page.keyboard.press("7");

  await expect(usdAmount).toHaveValue("7");
});

test("restores cached currencies and rates on the next app load", async ({
  context,
  page,
}) => {
  await gotoConverter(page);
  await page.getByRole("button", { name: "Edit currencies" }).click();
  await expect(page.getByRole("button", { name: "Add GBP" })).toBeVisible();
  // Wait for the throttled cache writer to store both queries.
  await expect
    .poll(() =>
      page.evaluate(() => {
        const cache =
          window.localStorage.getItem("currency-app:query-cache:v1") ?? "";

        return ["supportedCurrencies", "exchangeRates"].every((key) =>
          cache.includes(key),
        );
      }),
    )
    .toBe(true);

  // A new page skips the beforeEach localStorage reset, like reopening the PWA.
  const nextPage = await context.newPage();
  const apiRequests: string[] = [];
  for (const apiRoute of ["**/api/currencies", "**/api/exchange-rates**"]) {
    await nextPage.route(apiRoute, async (route) => {
      apiRequests.push(route.request().url());
      await route.abort();
    });
  }

  await nextPage.goto("/");
  await expect(nextPage.getByText(ratesUpdatedText)).toBeVisible();
  await expect(
    nextPage.getByRole("textbox", { name: "USD amount" }),
  ).toHaveValue("1.08");
  await nextPage.getByRole("button", { name: "Edit currencies" }).click();
  await expect(
    nextPage.getByRole("button", { name: "Add GBP" }),
  ).toBeVisible();
  expect(apiRequests).toEqual([]);
});

test.describe("motion", () => {
  function animationName(locator: ReturnType<Page["locator"]>) {
    return locator.evaluate((element) => getComputedStyle(element).animationName);
  }

  test("slides the editor sheet in and out", async ({ page }) => {
    await gotoConverter(page);
    await page.getByRole("button", { name: "Edit currencies" }).click();

    const dialog = page.getByRole("dialog", { name: "Edit currencies" });
    await expect(dialog).toBeVisible();
    expect(await animationName(dialog)).not.toBe("none");

    await dialog.getByRole("button", { name: "Done" }).click();

    // Stays mounted while the exit animation runs, then unmounts.
    await expect(dialog).toHaveAttribute("data-closing", "");
    await expect(dialog).toHaveCount(0);
  });

  test("animates newly added currency rows", async ({ page }) => {
    await gotoConverter(page);
    await page.getByRole("button", { name: "Edit currencies" }).click();
    const dialog = page.getByRole("dialog", { name: "Edit currencies" });

    await dialog.getByRole("button", { name: "Add GBP" }).click();

    const addedEditorRow = dialog
      .getByRole("button", { name: "Drag GBP to reorder" })
      .locator("xpath=ancestor::li[1]");
    const existingEditorRow = dialog
      .getByRole("button", { name: "Drag EUR to reorder" })
      .locator("xpath=ancestor::li[1]");
    expect(await animationName(addedEditorRow)).not.toBe("none");
    expect(await animationName(existingEditorRow)).toBe("none");

    await dialog.getByRole("button", { name: "Done" }).click();
    const converterRow = page
      .getByRole("textbox", { name: "GBP amount" })
      .locator("xpath=ancestor::li[1]");
    expect(await animationName(converterRow)).not.toBe("none");
  });

  test("raises the undo toast", async ({ page }) => {
    await gotoConverter(page);
    await page.getByRole("button", { name: "Edit currencies" }).click();
    const dialog = page.getByRole("dialog", { name: "Edit currencies" });

    await dialog.getByRole("button", { name: "Remove KRW" }).click();

    const toast = dialog.getByRole("status").filter({ hasText: "KRW removed" });
    await expect(toast).toBeVisible();
    expect(await animationName(toast)).not.toBe("none");
  });

  test("slides the keypad closed and open", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoConverter(page);

    const keys = page.locator("[data-keypad-keys]");
    const openHeight = (await keys.boundingBox())?.height ?? 0;
    expect(openHeight).toBeGreaterThan(100);

    await page.getByRole("button", { name: "Hide keyboard" }).click();

    // Keys stay mounted and shrink, instead of vanishing in one frame.
    expect(
      await keys.evaluate((element) => element.getAnimations().length),
    ).toBeGreaterThan(0);
    await settleAnimations(page);
    expect((await keys.boundingBox())?.height ?? 0).toBe(0);

    await page.getByRole("button", { name: "Show keyboard" }).click();
    expect(
      await keys.evaluate((element) => element.getAnimations().length),
    ).toBeGreaterThan(0);
    await settleAnimations(page);
    expect((await keys.boundingBox())?.height).toBe(openHeight);
  });

  test.describe("with reduced motion", () => {
    test.use({ reducedMotion: "reduce" });

    test("skips animations and closes the sheet at once", async ({ page }) => {
      await gotoConverter(page);
      await page.getByRole("button", { name: "Edit currencies" }).click();

      const dialog = page.getByRole("dialog", { name: "Edit currencies" });
      await expect(dialog).toBeVisible();
      expect(await animationName(dialog)).toBe("none");

      const converterRow = page
        .getByRole("textbox", { name: "EUR amount" })
        .locator("xpath=ancestor::li[1]");
      expect(await animationName(converterRow)).toBe("none");

      await dialog.getByRole("button", { name: "Done" }).click();
      await expect(dialog).toHaveCount(0, { timeout: 100 });
    });
  });
});
