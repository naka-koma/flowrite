import { test, expect } from "@playwright/test";
import { periodSelector, selectPeriodUnit } from "./helpers";

test("ボタンを押すとアドバイスが表示される", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "AIアドバイスを取得" }).click();

  await expect(page.getByText("外食を減らし")).toBeVisible();
});

test("アドバイスの見出し・箇条書き・強調がMarkdownとしてレンダリングされる", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "AIアドバイスを取得" }).click();

  await expect(page.getByRole("heading", { name: "今月のアドバイス" })).toBeVisible();
  await expect(page.getByText("10%増加")).toBeVisible();
  await expect(page.locator("strong", { hasText: "10%増加" })).toBeVisible();
  await expect(page.locator("li", { hasText: "外食を減らし、自炊を心がける" })).toBeVisible();
});

test("エラー時にエラーメッセージが表示される", async ({ page }) => {
  await page.goto("/");

  // AIアドバイス専用のピッカーで最古の月（データなし扱い）を選択する
  const select = page.getByLabel("AIアドバイス対象年月");
  const oldestValue = await select.locator("option").last().getAttribute("value");
  await select.selectOption(oldestValue!);

  await page.getByRole("button", { name: "AIアドバイスを取得" }).click();

  await expect(page.getByText("エラー: 指定した期間のデータがありません")).toBeVisible();
});

test("アドバイス取得ボタンはデータ取得を待たずに押せる", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("button", { name: "AIアドバイスを取得" })).toBeEnabled();
});

test("AIアドバイスの期間はホーム画面のサマリーとは独立して選択できる", async ({ page }) => {
  await page.goto("/");

  // ダッシュボードの期間選択を年タブに切り替えても、AIアドバイス側は月のまま独立している
  await selectPeriodUnit(page, "year");
  await expect(page.getByLabel("AIアドバイス対象年月")).toBeVisible();

  await page.getByTestId("ai-advice").getByRole("tab", { name: "年" }).click();
  await expect(page.getByLabel("AIアドバイス対象年")).toBeVisible();
  await expect(periodSelector(page).getByLabel("対象年月")).not.toBeVisible();
});

test("AIアドバイスで「全て」を選択すると期間セレクタが表示されない", async ({ page }) => {
  await page.goto("/");

  await page.getByTestId("ai-advice").getByRole("tab", { name: "全て" }).click();

  await expect(page.getByLabel("AIアドバイス対象年月")).not.toBeVisible();
  await expect(page.getByLabel("AIアドバイス対象年")).not.toBeVisible();

  await page.getByRole("button", { name: "AIアドバイスを取得" }).click();
  await expect(page.getByText("外食を減らし")).toBeVisible();
});
