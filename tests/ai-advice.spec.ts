import { test, expect } from "@playwright/test";
import { periodSelector } from "./helpers";

test("ボタンを押すとアドバイスが表示される", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "AIアドバイスを取得" }).click();

  await expect(page.getByText("外食を減らし")).toBeVisible();
});

test("エラー時にエラーメッセージが表示される", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __MOCK_SCENARIO__?: { trendEmpty?: boolean } }).__MOCK_SCENARIO__ = {
      trendEmpty: true,
    };
  });
  await page.goto("/");

  // AIアドバイス専用のピッカーで最古の月を選択し、contextを空にする
  const select = page.getByLabel("AIアドバイス対象年月");
  const oldestValue = await select.locator("option").last().getAttribute("value");
  await select.selectOption(oldestValue!);

  await page.getByRole("button", { name: "AIアドバイスを取得" }).click();

  await expect(page.getByText("エラー: context field is required")).toBeVisible();
});

test("AIアドバイスの期間はホーム画面のサマリーとは独立して選択できる", async ({ page }) => {
  await page.goto("/");

  // ダッシュボードの期間選択を年タブに切り替えても、AIアドバイス側は月のまま独立している
  await periodSelector(page).getByRole("tab", { name: "年" }).click();
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
