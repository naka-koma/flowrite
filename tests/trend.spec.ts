import { test, expect } from "@playwright/test";

test("トレンドチャートが表示される", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator(".recharts-responsive-container")).toBeVisible();
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
