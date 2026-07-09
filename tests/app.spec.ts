import { test, expect } from "@playwright/test";

test("ページが正しく表示される", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "flowrite" })).toBeVisible();
});
