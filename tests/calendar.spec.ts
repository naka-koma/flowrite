import { test, expect } from "@playwright/test";
import { openCalendar } from "./helpers";

test("カレンダー画面に遷移すると当月の収支ヘッダーとカレンダーが表示される", async ({ page }) => {
  await page.goto("/");
  await openCalendar(page);

  await expect(page.getByRole("heading", { name: "カレンダー" })).toBeVisible();
  await expect(page.getByText("当月収入:")).toBeVisible();
  await expect(page.getByText("当月支出:")).toBeVisible();
  await expect(page.getByText("当月収支:")).toBeVisible();

  for (const label of ["日", "月", "火", "水", "木", "金", "土"]) {
    await expect(page.getByText(label, { exact: true })).toBeVisible();
  }
});

test("前月/次月/当月ボタンで表示月が切り替わる", async ({ page }) => {
  await page.goto("/");
  await openCalendar(page);

  const now = new Date();
  const currentLabel = `${now.getFullYear()}年${now.getMonth() + 1}月`;
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevLabel = `${prevMonth.getFullYear()}年${prevMonth.getMonth() + 1}月`;

  await expect(page.getByTestId("calendar-period-label")).toHaveText(currentLabel);

  await page.getByRole("button", { name: "前の月" }).click();
  await expect(page.getByTestId("calendar-period-label")).toHaveText(prevLabel);

  await page.getByRole("button", { name: "当月" }).click();
  await expect(page.getByTestId("calendar-period-label")).toHaveText(currentLabel);
});

test("取引がある日は収支金額が色分け表示される", async ({ page }) => {
  await page.goto("/");
  await openCalendar(page);

  await expect(page.getByText("-1,500", { exact: true })).toBeVisible();
});

test("金額非表示時はカレンダー上の金額もマスクされる", async ({ page }) => {
  await page.goto("/");
  await openCalendar(page);

  await expect(page.getByText("-1,500", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "金額を隠す" }).click();

  await expect(page.getByText("-1,500", { exact: true })).not.toBeVisible();
  await expect(page.getByText("***").first()).toBeVisible();
});
