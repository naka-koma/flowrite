import { test, expect } from "@playwright/test";
import { openBudget, openSettings, openTransactionList } from "./helpers";

test("ブラウザの戻るで前の画面（レポート）に戻れる", async ({ page }) => {
  await page.goto("/");
  await openSettings(page);
  await expect(page.getByRole("heading", { name: "設定", exact: true })).toBeVisible();

  await page.goBack();

  await expect(page.getByRole("heading", { name: "設定", exact: true })).not.toBeVisible();
  await expect(page.getByText("支出: 150,000")).toBeVisible();
});

test("複数回遷移した後も、ブラウザの戻るで直前の画面へ順に戻れる", async ({ page }) => {
  await page.goto("/");
  await openTransactionList(page);
  await expect(page.getByRole("heading", { name: "取引一覧" })).toBeVisible();

  await openBudget(page);
  await expect(page.getByRole("heading", { name: "予算", exact: true })).toBeVisible();

  await page.goBack();
  await expect(page.getByRole("heading", { name: "予算", exact: true })).not.toBeVisible();
  await expect(page.getByRole("heading", { name: "取引一覧" })).toBeVisible();

  await page.goBack();
  await expect(page.getByRole("heading", { name: "取引一覧" })).not.toBeVisible();
  await expect(page.getByText("支出: 150,000")).toBeVisible();
});

test("ブラウザの進むで戻った先の画面へ再度進める", async ({ page }) => {
  await page.goto("/");
  await openSettings(page);
  await page.goBack();
  await expect(page.getByText("支出: 150,000")).toBeVisible();

  await page.goForward();

  await expect(page.getByRole("heading", { name: "設定", exact: true })).toBeVisible();
});

test("ハッシュを直接指定して読み込んだ場合、戻るボタンでレポート画面へ遷移する", async ({ page }) => {
  // アプリ内の履歴が無い状態（直接このURLを開いた想定）を再現する
  await page.goto("/#/settings");
  await expect(page.getByRole("heading", { name: "設定", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "戻る" }).click();

  await expect(page.getByRole("heading", { name: "設定", exact: true })).not.toBeVisible();
  await expect(page.getByText("支出: 150,000")).toBeVisible();
});

test("存在しないハッシュで読み込んだ場合はレポート画面が表示される", async ({ page }) => {
  await page.goto("/#/no-such-screen");

  await expect(page.getByText("支出: 150,000")).toBeVisible();
});
