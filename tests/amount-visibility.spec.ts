import { test, expect } from "@playwright/test";

test("トグルで金額をマスク表示に切り替えられる", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("合計支出: 150,000")).toBeVisible();

  await page.getByRole("button", { name: "金額を隠す" }).click();

  await expect(page.getByText("合計支出: ***")).toBeVisible();
  await expect(page.getByText("合計支出: 150,000")).not.toBeVisible();

  await page.getByRole("button", { name: "金額を表示する" }).click();

  await expect(page.getByText("合計支出: 150,000")).toBeVisible();
});

test("金額の非表示設定は再読み込み後も保持される", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "金額を隠す" }).click();
  await expect(page.getByText("合計支出: ***")).toBeVisible();

  await page.reload();

  await expect(page.getByText("合計支出: ***")).toBeVisible();
  await expect(page.getByRole("button", { name: "金額を表示する" })).toBeVisible();
});

test("非表示時は取引明細やAIアドバイスの金額もマスクされる", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "金額を隠す" }).click();

  await page.getByRole("button", { name: "食費" }).click();
  await expect(page.getByRole("cell", { name: "***", exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: "AIアドバイスを取得" }).click();
  await expect(page.getByText(/月\*\*\*円程度の節約/)).toBeVisible();
});
