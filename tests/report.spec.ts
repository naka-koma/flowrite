import { test, expect } from "@playwright/test";
import { openReport } from "./helpers";

test("レポート画面に遷移すると推移グラフ・内訳・比較が表示される", async ({ page }) => {
  await page.goto("/");
  await openReport(page);

  await expect(page.getByRole("heading", { name: "レポート" })).toBeVisible();
  await expect(page.getByText("収入: 300,000")).toBeVisible();
  await expect(page.getByText("支出: 150,000")).toBeVisible();

  await expect(page.getByText("収入内訳")).toBeVisible();
  await expect(page.getByText("支出内訳")).toBeVisible();
  await expect(page.locator(".recharts-pie")).toHaveCount(2);
});

test("推移グラフが棒+折れ線の複合グラフで表示される", async ({ page }) => {
  await page.goto("/");
  await openReport(page);

  await expect(page.getByText("全体推移")).toBeVisible();
  await expect(page.locator(".recharts-bar").first()).toBeVisible();
  await expect(page.locator(".recharts-line").first()).toBeVisible();
});

test("前月比・前年同月比較が表示される", async ({ page }) => {
  await page.goto("/");
  await openReport(page);

  await expect(page.getByText(/前月 \(.+\) と比較/)).toBeVisible();
  await expect(page.getByText(/前年同月 \(.+\) と比較/)).toBeVisible();
  await expect(page.getByText("収入が前より10,000円増えました")).toBeVisible();
  await expect(page.getByText("支出が前より30,000円減りました")).toBeVisible();
  await expect(page.getByText("収支が前より40,000円増えました")).toBeVisible();
});

test("収入内訳のカテゴリーを選択すると取引明細が表示される", async ({ page }) => {
  await page.goto("/");
  await openReport(page);

  await page.getByRole("button", { name: "給与" }).click();

  await expect(page.getByText("給与の取引明細")).toBeVisible();
  await expect(page.getByRole("cell", { name: "給与振込" })).toBeVisible();

  await page.getByRole("button", { name: "閉じる" }).click();
  await expect(page.getByText("給与の取引明細")).not.toBeVisible();
});

test("データなしの月では収入・支出内訳が空メッセージになる", async ({ page }) => {
  await page.goto("/");
  await openReport(page);

  const select = page.getByLabel("対象年月");
  const oldestValue = await select.locator("option").last().getAttribute("value");
  await select.selectOption(oldestValue!);

  await expect(page.getByText("この月の収入データはありません")).toBeVisible();
  await expect(page.getByText("この月の支出データはありません")).toBeVisible();
});

test("戻るボタンでダッシュボードに戻れる", async ({ page }) => {
  await page.goto("/");
  await openReport(page);

  await page.getByRole("button", { name: "ダッシュボードに戻る" }).click();
  await expect(page.getByRole("heading", { name: "レポート" })).not.toBeVisible();
});
