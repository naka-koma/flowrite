import { test, expect } from "@playwright/test";
import { periodSelector, selectPeriodUnit } from "./helpers";

test("気になる点を探すと候補が表示され、選ぶと最初のAIメッセージとquick_repliesが表示される", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "気になる点を探す" }).click();
  await page.getByRole("button", { name: "外食費が先月より増えています" }).click();

  await expect(page.getByText("今月は先月より支出が増えていますね")).toBeVisible();
  await expect(page.getByRole("button", { name: "外食が増えたかも" })).toBeVisible();
  await expect(page.getByRole("button", { name: "特に思い当たらない" })).toBeVisible();
});

test("quick_replyを選ぶと対話が進む", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "気になる点を探す" }).click();
  await page.getByRole("button", { name: "外食費が先月より増えています" }).click();
  await page.getByRole("button", { name: "外食が増えたかも" }).click();

  await expect(page.getByText("なるほど、外食が増えているんですね")).toBeVisible();
  await expect(page.getByRole("button", { name: "来月は減らしたい" })).toBeVisible();
});

test("対話が完了すると予算適用ボタンが表示され、押すと予算に反映される", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "気になる点を探す" }).click();
  await page.getByRole("button", { name: "外食費が先月より増えています" }).click();
  await page.getByRole("button", { name: "外食が増えたかも" }).click();
  await page.getByRole("button", { name: "来月は減らしたい" }).click();

  await expect(page.getByText("食費の予算を見直しましょう")).toBeVisible();
  await expect(page.getByText("見直し案", { exact: true })).toBeVisible();
  await expect(page.getByText("35,000円", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "この見直し案を予算ページに適用する" }).click();

  await expect(page.getByText("予算に反映しました")).toBeVisible();
});

test("「その他を入力」で自由入力の返信を送信できる", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "気になる点を探す" }).click();
  await page.getByRole("button", { name: "外食費が先月より増えています" }).click();
  await expect(page.getByRole("button", { name: "その他を入力" })).toBeVisible();
  await expect(page.getByLabel("自由入力の返信")).not.toBeVisible();

  await page.getByRole("button", { name: "その他を入力" }).click();
  await page.getByLabel("自由入力の返信").fill("実は副業の経費が増えました");
  await page.getByRole("button", { name: "送信" }).click();

  await expect(page.getByText("実は副業の経費が増えました")).toBeVisible();
  await expect(page.getByText("なるほど、外食が増えているんですね")).toBeVisible();
  await expect(page.getByLabel("自由入力の返信")).not.toBeVisible();
});

test("AIのメッセージを「覚えておく」で記憶できる", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "気になる点を探す" }).click();
  await page.getByRole("button", { name: "外食費が先月より増えています" }).click();
  await expect(page.getByText("今月は先月より支出が増えていますね")).toBeVisible();

  await page.getByRole("button", { name: "覚えておく" }).click();

  await expect(page.getByText("記憶しました")).toBeVisible();
});

test("「最初からやり直す」で期間選択画面に戻る", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "気になる点を探す" }).click();
  await page.getByRole("button", { name: "外食費が先月より増えています" }).click();
  await expect(page.getByText("今月は先月より支出が増えていますね")).toBeVisible();

  await page.getByRole("button", { name: "最初からやり直す" }).click();

  await expect(page.getByRole("button", { name: "気になる点を探す" })).toBeVisible();
  await expect(page.getByText("今月は先月より支出が増えていますね")).not.toBeVisible();
});

test("データがない期間で気になる点を探すとエラーメッセージが表示される", async ({ page }) => {
  await page.goto("/");

  const select = page.getByLabel("AIアドバイス対象年月");
  const oldestValue = await select.locator("option").last().getAttribute("value");
  await select.selectOption(oldestValue!);

  await page.getByRole("button", { name: "気になる点を探す" }).click();

  await expect(page.getByText("エラー: 指定した期間のデータがありません")).toBeVisible();
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

  await page.getByRole("button", { name: "気になる点を探す" }).click();
  await page.getByRole("button", { name: "外食費が先月より増えています" }).click();
  await expect(page.getByText("今月は先月より支出が増えていますね")).toBeVisible();
});
