import { test, expect } from "@playwright/test";
import { openTransactionList } from "./helpers";

test("取引一覧画面に遷移すると取引が表示される", async ({ page }) => {
  await page.goto("/");
  await openTransactionList(page);

  await expect(page.getByRole("heading", { name: "取引一覧" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "店舗0" })).toBeVisible();
  await expect(page.getByText(/件中/)).toBeVisible();
});

test("次へボタンでページを送ると別の取引が表示される", async ({ page }) => {
  await page.goto("/");
  await openTransactionList(page);

  await expect(page.getByRole("cell", { name: "店舗0" })).toBeVisible();

  await page.getByRole("button", { name: "次へ" }).click();

  await expect(page.getByRole("cell", { name: "店舗0" })).not.toBeVisible();
  await expect(page.getByRole("button", { name: "前へ" })).toBeEnabled();
});

test("大項目をプルダウンで変更するとその行に反映される", async ({ page }) => {
  await page.goto("/");
  await openTransactionList(page);

  const row = page.getByRole("row").filter({ hasText: "店舗0" });
  await row.getByLabel("大項目").selectOption("娯楽");

  await expect(row.getByLabel("大項目")).toHaveValue("娯楽");
});

test("データなしの月では空メッセージが表示される", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __MOCK_SCENARIO__?: { transactionListEmpty?: boolean } }).__MOCK_SCENARIO__ = {
      transactionListEmpty: true,
    };
  });
  await page.goto("/");
  await openTransactionList(page);

  await expect(page.getByText("この月の取引はありません")).toBeVisible();
});

test("戻るボタンでダッシュボードに戻れる", async ({ page }) => {
  await page.goto("/");
  await openTransactionList(page);

  await page.getByRole("button", { name: "ダッシュボードに戻る" }).click();
  await expect(page.getByRole("heading", { name: "取引一覧" })).not.toBeVisible();
});
