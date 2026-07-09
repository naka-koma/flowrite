import { test, expect } from "@playwright/test";

test("年月を選択するとカテゴリー別支出一覧が表示される", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("合計支出: 150000")).toBeVisible();
  await expect(page.getByText("合計収入: 300000")).toBeVisible();
  await expect(page.getByRole("cell", { name: "食費" })).toBeVisible();
});

test("データなし時に適切なメッセージが表示される", async ({ page }) => {
  await page.goto("/");

  const select = page.getByLabel("対象年月");
  const oldestValue = await select.locator("option").last().getAttribute("value");
  await select.selectOption(oldestValue!);

  await expect(page.getByText("この月のデータはありません")).toBeVisible();
});
