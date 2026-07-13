import { test, expect } from "@playwright/test";
import { periodSelector, selectPeriodUnit } from "./helpers";

test("年月を選択するとカテゴリー別支出一覧が表示される", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("合計支出: 150,000")).toBeVisible();
  await expect(page.getByText("合計収入: 300,000")).toBeVisible();
  await expect(page.getByRole("cell", { name: "食費" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "40,000" })).toBeVisible();
});

test("データなし時に適切なメッセージが表示される", async ({ page }) => {
  await page.goto("/");

  const select = periodSelector(page).getByLabel("対象年月");
  const oldestValue = await select.locator("option").last().getAttribute("value");
  await select.selectOption(oldestValue!);

  await expect(page.getByText("この月のデータはありません")).toBeVisible();
});

test("カテゴリー別の円グラフが表示される", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator(".recharts-pie")).toBeVisible();
});

test("表示直後から円グラフの上部が欠けずに完成形で表示される（スマホ幅）", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/");

  const pie = page.locator(".recharts-pie");
  await expect(pie).toBeVisible();

  const box = await pie.boundingBox();
  expect(box).not.toBeNull();
  // 完成形のドーナツ円グラフは縦横比がほぼ1:1になる。
  // マウントアニメーションの途中で上部が描画されていない状態だと縦幅が横幅よりかなり小さくなる
  const ratio = box!.height / box!.width;
  expect(ratio).toBeGreaterThan(0.85);
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

test("年タブに切り替えると年単位の集計が表示される", async ({ page }) => {
  await page.goto("/");

  await selectPeriodUnit(page, "year");

  await expect(periodSelector(page).getByLabel("対象年")).toBeVisible();
  await expect(page.getByText("合計支出: 1,800,000")).toBeVisible();
  await expect(page.getByRole("cell", { name: "住居" })).toBeVisible();
});

test("週タブに切り替えると週単位の集計が表示される", async ({ page }) => {
  await page.goto("/");

  await selectPeriodUnit(page, "week");

  await expect(periodSelector(page).getByLabel("対象週")).toBeVisible();
  await expect(page.getByText("合計支出: 35,000")).toBeVisible();
});

test("集計単位を切り替えても既存の月単位表示に戻れる", async ({ page }) => {
  await page.goto("/");

  await selectPeriodUnit(page, "year");
  await expect(page.getByText("合計支出: 1,800,000")).toBeVisible();

  await selectPeriodUnit(page, "month");
  await expect(periodSelector(page).getByLabel("対象年月")).toBeVisible();
  await expect(page.getByText("合計支出: 150,000")).toBeVisible();
});

test("前月/次月ボタンで月を切り替えられる", async ({ page }) => {
  await page.goto("/");

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
  await selectPeriodUnit(page, "year");

  const now = new Date();

  await periodSelector(page).getByRole("button", { name: "前の年" }).click();
  await expect(page.getByTestId("period-label")).toHaveText(`${now.getFullYear() - 1}年`);

  await periodSelector(page).getByRole("button", { name: "次の年" }).click();
  await periodSelector(page).getByRole("button", { name: "次の年" }).click();
  await expect(page.getByTestId("period-label")).toHaveText(`${now.getFullYear() + 1}年`);
});

test("前週/次週ボタンで週を切り替えられる", async ({ page }) => {
  await page.goto("/");
  await selectPeriodUnit(page, "week");

  const initialLabel = await page.getByTestId("period-label").textContent();

  await periodSelector(page).getByRole("button", { name: "前の週" }).click();
  await expect(page.getByTestId("period-label")).not.toHaveText(initialLabel ?? "");

  await periodSelector(page).getByRole("button", { name: "次の週" }).click();
  await expect(page.getByTestId("period-label")).toHaveText(initialLabel ?? "");
});
