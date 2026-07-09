import { test, expect } from "@playwright/test";

test("トレンドチャートが表示される", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator(".recharts-responsive-container")).toBeVisible();
  await expect(page.getByText("支出").first()).toBeVisible();
  await expect(page.getByText("収入").first()).toBeVisible();
});

test("データなし時に適切なメッセージが表示される", async ({ page }) => {
  await page.setExtraHTTPHeaders({ "x-test-scenario": "empty" });
  await page.goto("/");

  await expect(page.getByText("トレンドデータはありません")).toBeVisible();
});
