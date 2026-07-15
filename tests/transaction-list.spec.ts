import { test, expect } from "@playwright/test";
import { openTransactionList } from "./helpers";

test("取引一覧画面に遷移すると取引が表示される", async ({ page }) => {
  await page.goto("/");
  await openTransactionList(page);

  await expect(page.getByRole("heading", { name: "取引一覧" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "店舗0" })).toBeVisible();
  await expect(page.getByText(/件中/).first()).toBeVisible();
});

test("件数・前へ/次へのコントロールがリスト上部・下部の両方に表示される", async ({ page }) => {
  await page.goto("/");
  await openTransactionList(page);

  await expect(page.getByText(/件中/)).toHaveCount(2);
  await expect(page.getByRole("button", { name: "次へ" })).toHaveCount(2);
  await expect(page.getByRole("button", { name: "前へ" })).toHaveCount(2);
});

test("次へボタンでページを送ると別の取引が表示される", async ({ page }) => {
  await page.goto("/");
  await openTransactionList(page);

  await expect(page.getByRole("cell", { name: "店舗0" })).toBeVisible();

  await page.getByRole("button", { name: "次へ" }).first().click();

  await expect(page.getByRole("cell", { name: "店舗0" })).not.toBeVisible();
  await expect(page.getByRole("button", { name: "前へ" }).first()).toBeEnabled();
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

test("メモをインライン編集して保存できる", async ({ page }) => {
  await page.goto("/");
  await openTransactionList(page);

  const row = page.getByRole("row").filter({ hasText: "店舗0" });
  const memoInput = row.getByLabel("メモ");
  await memoInput.fill("テストメモ");
  await memoInput.press("Tab");

  await expect(row.getByLabel("メモ")).toHaveValue("テストメモ");
});

test("大項目プルダウンから新しいカテゴリをその場で追加できる", async ({ page }) => {
  await page.goto("/");
  await openTransactionList(page);

  const row = page.getByRole("row").filter({ hasText: "店舗0" });
  await row.getByLabel("大項目").selectOption("__add_new__");
  await row.getByLabel("新しい大項目").fill("新カテゴリ");
  await row.getByLabel("新しい中項目").fill("新サブ");
  await row.getByRole("button", { name: "追加" }).click();

  await expect(row.getByLabel("大項目")).toHaveValue("新カテゴリ");
  await expect(row.getByLabel("中項目")).toHaveValue("新サブ");
});

test("表示件数を切り替えるとページングが変わる", async ({ page }) => {
  await page.goto("/");
  await openTransactionList(page);

  await page.getByLabel("表示件数").selectOption("10");

  await expect(page.getByText(/件中 1〜10件を表示/).first()).toBeVisible();
});

test("ロックチェックボックスを手動でON/OFFできる", async ({ page }) => {
  await page.goto("/");
  await openTransactionList(page);

  const row = page.getByRole("row").filter({ hasText: "店舗0" });
  const lockCheckbox = row.getByLabel("ロック");
  await expect(lockCheckbox).not.toBeChecked();

  await lockCheckbox.check();
  await expect(lockCheckbox).toBeChecked();

  await lockCheckbox.uncheck();
  await expect(lockCheckbox).not.toBeChecked();
});

test("表示件数ですべてを選択するとスクロールで追加の取引が読み込まれる", async ({ page }) => {
  await page.goto("/");
  await openTransactionList(page);

  await page.getByLabel("表示件数").selectOption("all");

  await expect(page.getByText("55件中 50件を読み込み済み").first()).toBeVisible();

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

  await expect(page.getByText("55件中 55件を読み込み済み").first()).toBeVisible();
});
