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

test("カテゴリー別の円グラフが表示される", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator(".recharts-pie")).toBeVisible();
});

test("カテゴリーを選択すると取引明細が表示される", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "食費" }).click();

  await expect(page.getByText("食費の取引明細")).toBeVisible();
  await expect(page.getByRole("cell", { name: "スーパー" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "コンビニ" })).toBeVisible();

  await page.getByRole("button", { name: "閉じる" }).click();
  await expect(page.getByText("食費の取引明細")).not.toBeVisible();
});
