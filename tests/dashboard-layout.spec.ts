import { test, expect } from "@playwright/test";
import { openSettings, periodSelector } from "./helpers";

test("セクションを非表示にするとホームから消え、再表示すると復活する", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("トレンド")).toBeVisible();

  await openSettings(page);
  await page.getByRole("checkbox", { name: "トレンドを表示" }).uncheck();
  await page.getByRole("button", { name: "ホーム" }).click();

  await expect(page.getByText("トレンド")).not.toBeVisible();

  await openSettings(page);
  await page.getByRole("checkbox", { name: "トレンドを表示" }).check();
  await page.getByRole("button", { name: "ホーム" }).click();

  await expect(page.getByText("トレンド")).toBeVisible();
});

test("上に移動ボタンでホームの表示順が変わる", async ({ page }) => {
  await page.goto("/");
  await openSettings(page);

  // デフォルト順は CSVアップロード/サマリー/トレンド/AIアドバイス。
  // AIアドバイスを1つ上に移動するとトレンドと入れ替わる
  await page.getByRole("button", { name: "AIアドバイスを上に移動" }).click();
  await page.getByRole("button", { name: "ホーム" }).click();

  const headings = page.locator("h2");
  await expect(headings).toHaveText(["期間", "CSVアップロード", "サマリー", "AIアドバイス", "トレンド"]);
});

test("ドラッグハンドルをキーボード操作で並び替えできる", async ({ page }) => {
  await page.goto("/");
  await openSettings(page);

  // デフォルト順は CSVアップロード/サマリー/トレンド/AIアドバイス。
  // AIアドバイスのハンドルをキーボードでつかみ、1つ上に移動してドロップする
  const handle = page.getByRole("button", { name: "AIアドバイスをドラッグして並び替え" });
  await handle.focus();
  await page.keyboard.press("Space");
  await page.waitForTimeout(200);
  await page.keyboard.press("ArrowUp");
  await page.waitForTimeout(200);
  await page.keyboard.press("Space");

  await page.getByRole("button", { name: "ホーム" }).click();

  const headings = page.locator("h2");
  await expect(headings).toHaveText(["期間", "CSVアップロード", "サマリー", "AIアドバイス", "トレンド"]);
});

test("サマリーを非表示にしても期間選択は表示され続ける", async ({ page }) => {
  await page.goto("/");
  await openSettings(page);

  await page.getByRole("checkbox", { name: "サマリーを表示" }).uncheck();
  await page.getByRole("button", { name: "ホーム" }).click();

  await expect(page.getByRole("heading", { name: "サマリー" })).not.toBeVisible();
  await expect(page.getByRole("heading", { name: "期間" })).toBeVisible();
  await expect(periodSelector(page).getByLabel("対象年月")).toBeVisible();
});

test("設定は再読み込み後も保持される", async ({ page }) => {
  await page.goto("/");
  await openSettings(page);

  await page.getByRole("checkbox", { name: "サマリーを表示" }).uncheck();
  await page.getByRole("button", { name: "ホーム" }).click();
  await expect(page.getByRole("heading", { name: "サマリー" })).not.toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "サマリー" })).not.toBeVisible();
});

test("初期状態に戻すボタンでデフォルトの表示に戻る", async ({ page }) => {
  await page.goto("/");
  await openSettings(page);

  await page.getByRole("checkbox", { name: "トレンドを表示" }).uncheck();
  await page.getByRole("button", { name: "初期状態に戻す" }).click();

  await expect(page.getByRole("checkbox", { name: "トレンドを表示" })).toBeChecked();

  await page.getByRole("button", { name: "ホーム" }).click();
  await expect(page.getByRole("heading", { name: "トレンド" })).toBeVisible();
});

test("全セクションを非表示にすると案内メッセージが表示される", async ({ page }) => {
  await page.goto("/");
  await openSettings(page);

  await page.getByRole("checkbox", { name: "CSVアップロードを表示" }).uncheck();
  await page.getByRole("checkbox", { name: "サマリーを表示" }).uncheck();
  await page.getByRole("checkbox", { name: "トレンドを表示" }).uncheck();
  await page.getByRole("checkbox", { name: "AIアドバイスを表示" }).uncheck();
  await page.getByRole("button", { name: "ホーム" }).click();

  await expect(page.getByText("表示するセクションがありません")).toBeVisible();
});
