import { test, expect } from "@playwright/test";

test("トレンドチャートが表示される", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator(".recharts-line").first()).toBeVisible();
  await expect(page.getByText("支出").first()).toBeVisible();
  await expect(page.getByText("収入").first()).toBeVisible();
});

test("データなし時に適切なメッセージが表示される", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __MOCK_SCENARIO__?: { trendEmpty?: boolean } }).__MOCK_SCENARIO__ = {
      trendEmpty: true,
    };
  });
  await page.goto("/");

  await expect(page.getByText("トレンドデータはありません")).toBeVisible();
});

test("年タブに切り替えるとトレンドも年単位の粒度になる", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("tab", { name: "年" }).click();

  await expect(page.locator(".recharts-line").first()).toBeVisible();
  await expect(page.locator(".recharts-xAxis").getByText("2024年", { exact: true })).toBeVisible();
});

test("週タブに切り替えるとトレンドも週単位の粒度になる", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("tab", { name: "週" }).click();

  await expect(page.locator(".recharts-line").first()).toBeVisible();
  await expect(page.getByText("06/16", { exact: true })).toBeVisible();
});

test("表示件数が上限以下の場合はスクロール不要", async ({ page }) => {
  await page.goto("/");

  const container = page.getByTestId("trend-scroll-container");
  await expect(container).toBeVisible();

  const { scrollWidth, clientWidth } = await container.evaluate((el) => ({
    scrollWidth: el.scrollWidth,
    clientWidth: el.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
});

test("表示件数が上限を超えるとスクロールで過去分を確認でき、初期表示は最新データ側になる", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __MOCK_SCENARIO__?: { trendManyPoints?: boolean } }).__MOCK_SCENARIO__ = {
      trendManyPoints: true,
    };
  });
  await page.goto("/");

  const container = page.getByTestId("trend-scroll-container");
  await expect(container).toBeVisible();

  const { scrollWidth, clientWidth, scrollLeft } = await container.evaluate((el) => ({
    scrollWidth: el.scrollWidth,
    clientWidth: el.clientWidth,
    scrollLeft: el.scrollLeft,
  }));

  expect(scrollWidth).toBeGreaterThan(clientWidth);
  expect(scrollLeft).toBeGreaterThan(0);
});
