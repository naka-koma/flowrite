import { test, expect } from "@playwright/test";

test("CSVファイルを選択してアップロードすると結果が表示される", async ({ page }) => {
  await page.goto("/");

  await page
    .getByLabel("CSVファイル")
    .setInputFiles({
      name: "moneyforward.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("計算対象,日付,内容\n1,2025/12/01,テスト\n"),
    });
  await page.getByRole("button", { name: "アップロード" }).click();

  await expect(page.getByText("追加件数: 12")).toBeVisible();
  await expect(page.getByText("スキップ件数: 3")).toBeVisible();
});

test("エラーレスポンス時にエラーメッセージが表示される", async ({ page }) => {
  await page.goto("/");

  await page
    .getByLabel("CSVファイル")
    .setInputFiles({
      name: "invalid.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("INVALID"),
    });
  await page.getByRole("button", { name: "アップロード" }).click();

  await expect(page.getByRole("alert")).toContainText("CSVの形式が正しくありません");
});
