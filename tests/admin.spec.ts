import { test, expect } from "@playwright/test";

test("マイグレーションを実行すると結果が表示される", async ({ page }) => {
  await page.goto("/");

  page.on("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "マイグレーション実行" }).click();

  await expect(page.getByText("001_normalize_raw_data_amount")).toBeVisible();
});

test("確認ダイアログをキャンセルすると実行されない", async ({ page }) => {
  await page.goto("/");

  page.on("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "マイグレーション実行" }).click();

  await expect(page.getByText("001_normalize_raw_data_amount")).not.toBeVisible();
});

test("同じマイグレーションは二重に適用されない", async ({ page }) => {
  await page.goto("/");

  page.on("dialog", (dialog) => dialog.accept());

  await page.getByRole("button", { name: "マイグレーション実行" }).click();
  await expect(page.getByText("001_normalize_raw_data_amount")).toBeVisible();

  await page.getByRole("button", { name: "マイグレーション実行" }).click();
  await expect(page.getByText("適用対象のマイグレーションはありませんでした")).toBeVisible();
});
