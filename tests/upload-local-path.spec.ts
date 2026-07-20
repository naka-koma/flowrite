import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test, expect } from "@playwright/test";

// パス指定モードはローカル開発サーバー（npm run dev、scripts/vite-plugin-local-csv.js）でのみ
// 動作するため、実際にディスク上へ一時CSVを作成してテストする
function writeTempCsv(fileName: string, content: string): string {
  const dir = mkdtempSync(join(tmpdir(), "flowrite-upload-test-"));
  const path = join(dir, fileName);
  writeFileSync(path, content);
  return path;
}

test("パスを指定してCSVを読み込み、アップロードできる", async ({ page }) => {
  const path = writeTempCsv("moneyforward.csv", "計算対象,日付,内容\n1,2025/12/01,テスト\n");

  await page.goto("/");
  await page.getByRole("tab", { name: "パスで指定" }).click();
  await page.getByLabel("CSVファイルのパス").fill(path);
  await page.getByRole("button", { name: "読み込む" }).click();

  await expect(page.getByText("1件のファイルを読み込みました")).toBeVisible();

  await page.getByRole("button", { name: "アップロード" }).click();

  await expect(page.getByText("追加件数: 12")).toBeVisible();
  await expect(page.getByText("スキップ件数: 3")).toBeVisible();

  rmSync(path, { force: true });
});

test("複数のパスを1行ずつ指定してまとめて読み込める", async ({ page }) => {
  const path1 = writeTempCsv("moneyforward-1.csv", "計算対象,日付,内容\n1,2025/11/01,テスト\n");
  const path2 = writeTempCsv("moneyforward-2.csv", "計算対象,日付,内容\n1,2025/12/01,テスト\n");

  await page.goto("/");
  await page.getByRole("tab", { name: "パスで指定" }).click();
  await page.getByLabel("CSVファイルのパス").fill(`${path1}\n${path2}`);
  await page.getByRole("button", { name: "読み込む" }).click();

  await expect(page.getByText("2件のファイルを読み込みました")).toBeVisible();

  await page.getByRole("button", { name: "アップロード" }).click();

  await expect(page.getByText("追加件数: 24")).toBeVisible();
  await expect(page.getByText("スキップ件数: 6")).toBeVisible();

  rmSync(path1, { force: true });
  rmSync(path2, { force: true });
});

test("存在しないパスを指定するとエラーが表示される", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "パスで指定" }).click();
  await page.getByLabel("CSVファイルのパス").fill("C:\\not-exist\\moneyforward.csv");
  await page.getByRole("button", { name: "読み込む" }).click();

  await expect(page.getByText(/ファイルが見つかりません/)).toBeVisible();
});

test("CSV以外の拡張子を指定するとエラーが表示される", async ({ page }) => {
  const dir = mkdtempSync(join(tmpdir(), "flowrite-upload-test-"));
  const path = join(dir, "moneyforward.txt");
  writeFileSync(path, "not a csv");

  await page.goto("/");
  await page.getByRole("tab", { name: "パスで指定" }).click();
  await page.getByLabel("CSVファイルのパス").fill(path);
  await page.getByRole("button", { name: "読み込む" }).click();

  await expect(page.getByText(/CSVファイルのみ読み込めます/)).toBeVisible();

  rmSync(path, { force: true });
});

test("ファイル選択タブがデフォルトで表示され、パスタブに切り替えられる", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByLabel("CSVファイル", { exact: true })).toBeVisible();
  await expect(page.getByLabel("CSVファイルのパス")).not.toBeVisible();

  await page.getByRole("tab", { name: "パスで指定" }).click();

  await expect(page.getByLabel("CSVファイル", { exact: true })).not.toBeVisible();
  await expect(page.getByLabel("CSVファイルのパス")).toBeVisible();
});
