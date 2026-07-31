import { test, expect } from "@playwright/test";
import { openAiScreen, periodSelector } from "./helpers";

test("トグルで金額をマスク表示に切り替えられる", async ({ page }) => {
  await page.goto("/");

  await expect(periodSelector(page).getByText("支出: 150,000")).toBeVisible();

  await page.getByRole("button", { name: "金額を隠す" }).click();

  await expect(periodSelector(page).getByText("支出: ***")).toBeVisible();
  await expect(periodSelector(page).getByText("支出: 150,000")).not.toBeVisible();

  await page.getByRole("button", { name: "金額を表示する" }).click();

  await expect(periodSelector(page).getByText("支出: 150,000")).toBeVisible();
});

test("金額の非表示設定は再読み込みすると引き継がれない（スクショ共有用の一時的な設定のため）", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "金額を隠す" }).click();
  await expect(periodSelector(page).getByText("支出: ***")).toBeVisible();

  await page.reload();

  await expect(periodSelector(page).getByText("支出: 150,000")).toBeVisible();
  await expect(page.getByRole("button", { name: "金額を隠す" })).toBeVisible();
});

test("非表示時は取引明細やAIアドバイスの金額もマスクされる", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "金額を隠す" }).click();

  await page.getByRole("button", { name: "食費" }).click();
  await expect(page.getByRole("cell", { name: "***", exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "閉じる" }).click();

  await openAiScreen(page);
  await page.getByRole("button", { name: "今月のざっくり振り返り" }).click();
  await page.getByRole("button", { name: "外食が増えたかも" }).click();
  await page.getByRole("button", { name: "来月は減らしたい" }).click();

  await expect(page.getByText(/来月は\*\*\*円を目安/)).toBeVisible();
});
