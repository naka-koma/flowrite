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
