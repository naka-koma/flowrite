import { test, expect } from "@playwright/test";

test("設定画面からダッシュボードに戻れる", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "設定を開く" }).click();
  await expect(page.getByRole("heading", { name: "設定", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "ダッシュボードに戻る" }).click();
  await expect(page.getByText("合計支出: 150000")).toBeVisible();
});

test("テーマを切り替えるとdata-theme属性が変わり、再読み込み後も保持される", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("html")).toHaveAttribute("data-theme", "fluorite");

  await page.getByRole("button", { name: "設定を開く" }).click();
  await page.getByLabel("ダーク（蛍石）").check();

  await expect(page.locator("html")).toHaveAttribute("data-theme", "fluorite-dark");

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "fluorite-dark");
});
