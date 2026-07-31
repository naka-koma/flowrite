import { test, expect } from "@playwright/test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openUpload } from "./helpers";

test("CSVファイルを選択してアップロードすると結果が表示される", async ({ page }) => {
  await page.goto("/");
  await openUpload(page);

  await page
    .getByLabel("CSVファイル")
    .setInputFiles({
      name: "moneyforward.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("計算対象,日付,内容\n1,2025/12/01,テスト\n"),
    });
  await page.getByRole("button", { name: "アップロード", exact: true }).click();

  await expect(page.getByText("追加件数: 12")).toBeVisible();
  await expect(page.getByText("スキップ件数: 3")).toBeVisible();
});

function csv(name: string, date = "2025/12/01") {
  return { name, mimeType: "text/csv", buffer: Buffer.from(`計算対象,日付,内容\n1,${date},テスト\n`) };
}

const CSV_CONTENT = "計算対象,日付,内容\n1,2025/12/01,テスト\n";

// webkitdirectory付きのinputは実ディレクトリのパスしか受け付けないため、一時フォルダを用意する
function makeCsvDir(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), "flowrite-csv-"));
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(join(dir, name), content);
  }
  return dir;
}

test("フォルダを選択すると中のCSVがまとめて読み込まれ、選択中の一覧が表示される", async ({ page }) => {
  await page.goto("/");
  await openUpload(page);

  const dir = makeCsvDir({
    "収入・支出詳細_2026-02-01_2026-02-28.csv": CSV_CONTENT,
    "収入・支出詳細_2026-01-01_2026-01-31.csv": CSV_CONTENT,
    "収入・支出詳細_2026-03-01_2026-03-31.csv": CSV_CONTENT,
  });
  await page.getByLabel("CSVフォルダ").setInputFiles(dir);

  const selected = page.getByTestId("selected-csv-files");
  await expect(selected.getByText("選択中: 3件")).toBeVisible();
  // ファイル名順に並ぶ
  await expect(selected.getByRole("listitem").first()).toHaveText("収入・支出詳細_2026-01-01_2026-01-31.csv");

  await page.getByRole("button", { name: "アップロード", exact: true }).click();
  await expect(page.getByText("追加件数: 36")).toBeVisible();
});

test("フォルダ内のCSV以外のファイルは除外される", async ({ page }) => {
  await page.goto("/");
  await openUpload(page);

  const dir = makeCsvDir({
    "収入・支出詳細_2026-01-01_2026-01-31.csv": CSV_CONTENT,
    "メモ.txt": "これはCSVではない",
    "資産.xlsx": "dummy",
  });
  await page.getByLabel("CSVフォルダ").setInputFiles(dir);

  const selected = page.getByTestId("selected-csv-files");
  await expect(selected.getByText("選択中: 1件")).toBeVisible();
  await expect(selected.getByRole("listitem")).toHaveCount(1);
});

test("ドラッグ&ドロップでCSVを追加できる", async ({ page }) => {
  await page.goto("/");
  await openUpload(page);

  const dataTransfer = await page.evaluateHandle(() => {
    const dt = new DataTransfer();
    dt.items.add(new File(["計算対象,日付,内容\n1,2025/12/01,テスト\n"], "dropped.csv", { type: "text/csv" }));
    dt.items.add(new File(["not csv"], "readme.txt", { type: "text/plain" }));
    return dt;
  });
  await page.getByTestId("csv-drop-zone").dispatchEvent("drop", { dataTransfer });

  const selected = page.getByTestId("selected-csv-files");
  await expect(selected.getByText("選択中: 1件")).toBeVisible();
  await expect(selected.getByRole("listitem")).toHaveText("dropped.csv");
});

test("選択を追加すると累積し、クリアで空になる", async ({ page }) => {
  await page.goto("/");
  await openUpload(page);

  await page.getByLabel("CSVファイル").setInputFiles([csv("a.csv")]);
  await expect(page.getByTestId("selected-csv-files").getByText("選択中: 1件")).toBeVisible();

  const dir = makeCsvDir({ "b.csv": CSV_CONTENT, "c.csv": CSV_CONTENT });
  await page.getByLabel("CSVフォルダ").setInputFiles(dir);
  await expect(page.getByTestId("selected-csv-files").getByText("選択中: 3件")).toBeVisible();

  // 同じファイルを再度選んでも重複しない
  await page.getByLabel("CSVファイル").setInputFiles([csv("a.csv")]);
  await expect(page.getByTestId("selected-csv-files").getByText("選択中: 3件")).toBeVisible();

  await page.getByRole("button", { name: "クリア" }).click();
  await expect(page.getByTestId("selected-csv-files")).not.toBeVisible();
  await expect(page.getByRole("button", { name: "アップロード", exact: true })).toBeDisabled();
});

test("カテゴリ・メモの上書きチェックボックスはデフォルトでオンになっている", async ({ page }) => {
  await page.goto("/");
  await openUpload(page);

  await expect(page.getByLabel("カテゴリ・メモをCSVの内容で上書きする")).toBeChecked();
});

test("上書きチェックボックスをオフにしてもアップロードできる", async ({ page }) => {
  await page.goto("/");
  await openUpload(page);

  await page.getByLabel("カテゴリ・メモをCSVの内容で上書きする").uncheck();
  await page
    .getByLabel("CSVファイル")
    .setInputFiles({
      name: "moneyforward.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("計算対象,日付,内容\n1,2025/12/01,テスト\n"),
    });
  await page.getByRole("button", { name: "アップロード", exact: true }).click();

  await expect(page.getByText("追加件数: 12")).toBeVisible();
  await expect(page.getByText("スキップ件数: 3")).toBeVisible();
});

test("エラーレスポンス時にエラーメッセージが表示される", async ({ page }) => {
  await page.goto("/");
  await openUpload(page);

  await page
    .getByLabel("CSVファイル")
    .setInputFiles({
      name: "invalid.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("INVALID"),
    });
  await page.getByRole("button", { name: "アップロード", exact: true }).click();

  await expect(page.getByRole("alert")).toContainText("CSVの形式が正しくありません");
});

test("複数のCSVファイルを一括アップロードすると合計件数が表示される", async ({ page }) => {
  await page.goto("/");
  await openUpload(page);

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
  await page.getByRole("button", { name: "アップロード", exact: true }).click();

  await expect(page.getByText("追加件数: 24")).toBeVisible();
  await expect(page.getByText("スキップ件数: 6")).toBeVisible();
  await expect(page.getByText("moneyforward-2025-11.csv:")).toBeVisible();
  await expect(page.getByText("moneyforward-2025-12.csv:")).toBeVisible();
});

test("複数ファイルの一部でエラーが発生しても他のファイルの処理は継続する", async ({ page }) => {
  await page.goto("/");
  await openUpload(page);

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
  await page.getByRole("button", { name: "アップロード", exact: true }).click();

  // 成功したファイル分の集計は表示される
  await expect(page.getByText("追加件数: 12")).toBeVisible();
  await expect(page.getByText("スキップ件数: 3")).toBeVisible();
  // 失敗したファイルはエラー表示される
  await expect(page.getByRole("alert")).toContainText("CSVの形式が正しくありません");
});
