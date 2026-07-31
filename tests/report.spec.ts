import { test, expect } from "@playwright/test";
import { openReport, openBudget, periodSelector, selectPeriodUnit } from "./helpers";

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

  await expect(page.getByRole("button", { name: "全体推移", exact: true })).toBeVisible();
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

test("支出内訳のカテゴリーを選択すると取引明細が表示される", async ({ page }) => {
  await page.goto("/");
  await openReport(page);

  await page.getByRole("button", { name: "食費" }).click();

  await expect(page.getByText("食費の取引明細")).toBeVisible();
  await expect(page.getByRole("cell", { name: "スーパー" })).toBeVisible();

  await page.getByRole("button", { name: "閉じる" }).click();
  await expect(page.getByText("食費の取引明細")).not.toBeVisible();
});

test("データなしの月では収入・支出内訳が空メッセージになる", async ({ page }) => {
  await page.goto("/");
  await openReport(page);

  const select = page.getByLabel("対象年月");
  const oldestValue = await select.locator("option").last().getAttribute("value");
  await select.selectOption(oldestValue!);

  await expect(page.getByText("この期間の収入データはありません")).toBeVisible();
  await expect(page.getByText("この期間の支出データはありません")).toBeVisible();
});

test("表示直後から円グラフの上部が欠けずに完成形で表示される（スマホ幅）", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/");
  await openReport(page);

  const pie = page.locator(".recharts-pie").first();
  await expect(pie).toBeVisible();

  const box = await pie.boundingBox();
  expect(box).not.toBeNull();
  // 完成形のドーナツ円グラフは縦横比がほぼ1:1になる。
  // マウントアニメーションの途中で上部が描画されていない状態だと縦幅が横幅よりかなり小さくなる
  const ratio = box!.height / box!.width;
  expect(ratio).toBeGreaterThan(0.85);
});

test("年タブに切り替えると年単位の集計が表示される", async ({ page }) => {
  await page.goto("/");
  await openReport(page);

  await selectPeriodUnit(page, "year");

  await expect(periodSelector(page).getByLabel("対象年")).toBeVisible();
  await expect(page.getByText("支出: 1,800,000")).toBeVisible();
  await expect(page.getByRole("cell", { name: "住居" })).toBeVisible();
});

test("全期間タブに切り替えると全期間の集計が表示される", async ({ page }) => {
  await page.goto("/");
  await openReport(page);

  await selectPeriodUnit(page, "all");

  await expect(page.getByText("支出: 9,000,000")).toBeVisible();
  await expect(page.getByRole("cell", { name: "住居" })).toBeVisible();
});

test("集計単位を切り替えても既存の月単位表示に戻れる", async ({ page }) => {
  await page.goto("/");
  await openReport(page);

  await selectPeriodUnit(page, "year");
  await expect(page.getByText("支出: 1,800,000")).toBeVisible();

  await selectPeriodUnit(page, "month");
  await expect(periodSelector(page).getByLabel("対象年月")).toBeVisible();
  await expect(page.getByText("支出: 150,000")).toBeVisible();
});

test("前月/次月ボタンで月を切り替えられる", async ({ page }) => {
  await page.goto("/");
  await openReport(page);

  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const label = (d: Date) => `${d.getFullYear()}年${d.getMonth() + 1}月`;

  await periodSelector(page).getByRole("button", { name: "前の月" }).click();
  await expect(page.getByTestId("period-label")).toHaveText(label(prevMonth));

  await periodSelector(page).getByRole("button", { name: "次の月" }).click();
  await periodSelector(page).getByRole("button", { name: "次の月" }).click();
  await expect(page.getByTestId("period-label")).toHaveText(label(nextMonth));
});

test("前年/次年ボタンで年を切り替えられる", async ({ page }) => {
  await page.goto("/");
  await openReport(page);
  await selectPeriodUnit(page, "year");

  const now = new Date();

  await periodSelector(page).getByRole("button", { name: "前の年" }).click();
  await expect(page.getByTestId("period-label")).toHaveText(`${now.getFullYear() - 1}年`);

  await periodSelector(page).getByRole("button", { name: "次の年" }).click();
  await periodSelector(page).getByRole("button", { name: "次の年" }).click();
  await expect(page.getByTestId("period-label")).toHaveText(`${now.getFullYear() + 1}年`);
});

test("レポート画面内にカレンダーセクションが表示される", async ({ page }) => {
  await page.goto("/");
  await openReport(page);

  await expect(page.getByRole("button", { name: "カレンダー", exact: true })).toBeVisible();
  await expect(page.getByText("当月収入:")).toBeVisible();
  await expect(page.getByText("当月支出:")).toBeVisible();
  await expect(page.getByText("当月収支:")).toBeVisible();

  const calendarGrid = page.getByTestId("monthly-calendar-grid");
  for (const label of ["日", "月", "火", "水", "木", "金", "土"]) {
    await expect(calendarGrid.getByText(label, { exact: true })).toBeVisible();
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

test("年・全期間タブではカレンダー・予算対比セクションが表示されない", async ({ page }) => {
  await page.goto("/");
  await openReport(page);

  await selectPeriodUnit(page, "year");
  await expect(page.getByRole("button", { name: "カレンダー", exact: true })).not.toBeVisible();
  await expect(page.getByRole("button", { name: "予算対比", exact: true })).not.toBeVisible();

  await selectPeriodUnit(page, "all");
  await expect(page.getByRole("button", { name: "カレンダー", exact: true })).not.toBeVisible();
  await expect(page.getByRole("button", { name: "予算対比", exact: true })).not.toBeVisible();
});

test("予算が未設定の場合は予算対比セクションに案内が表示される", async ({ page }) => {
  await page.goto("/");
  await openReport(page);

  await expect(page.getByRole("button", { name: "予算対比", exact: true })).toBeVisible();
  await expect(page.getByText("予算が設定されていません")).toBeVisible();
});

test("予算対比セクションに予算・実績・乖離額が表示される", async ({ page }) => {
  await page.goto("/");
  await openBudget(page);

  const budgetSettings = page.getByTestId("budget-settings");
  await budgetSettings.getByLabel("予算を設定する大項目").selectOption("食費");
  await budgetSettings.getByLabel("新しい月間予算額").fill("30000");
  await budgetSettings.getByRole("button", { name: "追加" }).click();
  await expect(budgetSettings.getByLabel("食費の月間予算額")).toHaveValue("30,000");

  await openReport(page);

  const row = page.getByTestId("budget-variance").locator("tr").filter({ hasText: "食費" });
  await expect(row.getByRole("cell", { name: "30,000" })).toBeVisible();
  await expect(row.getByRole("cell", { name: "40,000" })).toBeVisible();
  await expect(row.getByRole("cell", { name: "+10,000" })).toBeVisible();
});

test("セクションの▼をクリックすると開閉できる", async ({ page }) => {
  await page.goto("/");
  await openReport(page);

  await expect(page.getByRole("button", { name: "全体推移", exact: true })).toBeVisible();
  await expect(page.locator(".recharts-bar").first()).toBeVisible();

  await page.getByRole("button", { name: "全体推移", exact: true }).click();

  await expect(page.locator(".recharts-bar")).toHaveCount(0);

  await page.getByRole("button", { name: "全体推移", exact: true }).click();
  await expect(page.locator(".recharts-bar").first()).toBeVisible();
});
