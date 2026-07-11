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

test("複数のCSVファイルを一括アップロードすると合計件数が表示される", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("CSVファイル").setInputFiles([
    {
      name: "moneyforward-2025-11.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("計算対象,日付,内容\n1,2025/11/01,テスト\n"),
    },
    {
      name: "moneyforward-2025-12.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("計算対象,日付,内容\n1,2025/12/01,テスト\n"),
    },
  ]);
  await page.getByRole("button", { name: "アップロード" }).click();

  await expect(page.getByText("追加件数: 24")).toBeVisible();
  await expect(page.getByText("スキップ件数: 6")).toBeVisible();
  await expect(page.getByText("moneyforward-2025-11.csv:")).toBeVisible();
  await expect(page.getByText("moneyforward-2025-12.csv:")).toBeVisible();
});

test("複数ファイルの一部でエラーが発生しても他のファイルの処理は継続する", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("CSVファイル").setInputFiles([
    {
      name: "valid.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("計算対象,日付,内容\n1,2025/12/01,テスト\n"),
    },
    {
      name: "invalid.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("INVALID"),
    },
  ]);
  await page.getByRole("button", { name: "アップロード" }).click();

  // 成功したファイル分の集計は表示される
  await expect(page.getByText("追加件数: 12")).toBeVisible();
  await expect(page.getByText("スキップ件数: 3")).toBeVisible();
  // 失敗したファイルはエラー表示される
  await expect(page.getByRole("alert")).toContainText("CSVの形式が正しくありません");
});
