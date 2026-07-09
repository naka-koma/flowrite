import { test, expect } from "@playwright/test";

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

  // 最古の月を選択してサマリー・トレンド双方をデータなしにし、contextを空にする
  const select = page.getByLabel("対象年月");
  const oldestValue = await select.locator("option").last().getAttribute("value");
  await select.selectOption(oldestValue!);

  await page.getByRole("button", { name: "AIアドバイスを取得" }).click();

  await expect(page.getByText("エラー: context field is required")).toBeVisible();
});
