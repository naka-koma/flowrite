import { test, expect } from "@playwright/test";
import { openReport, openBudget } from "./helpers";

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

test("レポート画面内にカレンダーセクションが表示される", async ({ page }) => {
  await page.goto("/");
  await openReport(page);

  await expect(page.getByText("カレンダー")).toBeVisible();
  await expect(page.getByText("当月収入:")).toBeVisible();
  await expect(page.getByText("当月支出:")).toBeVisible();
  await expect(page.getByText("当月収支:")).toBeVisible();

  for (const label of ["日", "月", "火", "水", "木", "金", "土"]) {
    await expect(page.getByText(label, { exact: true })).toBeVisible();
  }
});

test("カレンダーの日をクリックするとその日の取引明細が表示される", async ({ page }) => {
  await page.goto("/");
  await openReport(page);

  await expect(page.getByText("-1,500", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /^5/ }).click();

  await expect(page.getByText("5日の取引明細")).toBeVisible();
  await expect(page.getByRole("cell", { name: "店舗5" })).toBeVisible();

  await page.getByRole("button", { name: "閉じる" }).click();
  await expect(page.getByText("5日の取引明細")).not.toBeVisible();
});

test("予算が未設定の場合は予算対比セクションに案内が表示される", async ({ page }) => {
  await page.goto("/");
  await openReport(page);

  await expect(page.getByText("予算対比")).toBeVisible();
  await expect(page.getByText("予算が設定されていません")).toBeVisible();
});

test("予算対比セクションに予算・実績・乖離額が表示される", async ({ page }) => {
  await page.goto("/");
  await openBudget(page);

  const budgetSettings = page.getByTestId("budget-settings");
  await budgetSettings.getByLabel("予算を設定する大項目").selectOption("食費");
  await budgetSettings.getByLabel("新しい月間予算額").fill("30000");
  await budgetSettings.getByRole("button", { name: "追加" }).click();
  await expect(budgetSettings.getByLabel("食費の月間予算額")).toHaveValue("30000");

  await openReport(page);

  const row = page.getByTestId("budget-variance").locator("tr").filter({ hasText: "食費" });
  await expect(row.getByRole("cell", { name: "30,000" })).toBeVisible();
  await expect(row.getByRole("cell", { name: "40,000" })).toBeVisible();
  await expect(row.getByRole("cell", { name: "+10,000" })).toBeVisible();
});

test("セクションの▼をクリックすると開閉できる", async ({ page }) => {
  await page.goto("/");
  await openReport(page);

  await expect(page.getByText("全体推移")).toBeVisible();
  await expect(page.locator(".recharts-bar").first()).toBeVisible();

  await page.getByRole("button", { name: "全体推移" }).click();

  await expect(page.locator(".recharts-bar")).toHaveCount(0);

  await page.getByRole("button", { name: "全体推移" }).click();
  await expect(page.locator(".recharts-bar").first()).toBeVisible();
});
