import { test, expect } from "@playwright/test";
import { openBudget, periodSelector, selectPeriodUnit } from "./helpers";

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

test("AIの応答がMarkdownとして描画され、改行が文字として残らない", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "気になる点を探す" }).click();
  await page.getByRole("button", { name: "外食費が先月より増えています" }).click();
  await page.getByRole("button", { name: "外食が増えたかも" }).click();

  const bubble = page.locator(".ai-advice-markdown").filter({ hasText: "なるほど、外食が増えているんですね" });

  // 見出し・箇条書き・強調がプレーンテキストではなく要素として描画される
  await expect(bubble.getByRole("heading", { name: "気になった点" })).toBeVisible();
  await expect(bubble.getByRole("listitem")).toHaveCount(2);
  await expect(bubble.getByText("食費全体")).toHaveJSProperty("tagName", "STRONG");

  // エスケープされた改行が文字として表示されていない
  await expect(bubble).not.toContainText("\\n");
  await expect(bubble).not.toContainText("##");
});

test("ユーザーの発言はMarkdownとして描画されない", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "気になる点を探す" }).click();
  await page.getByRole("button", { name: "外食費が先月より増えています" }).click();
  await page.getByRole("button", { name: "その他を入力" }).click();
  await page.getByLabel("自由入力の返信").fill("# これは見出しではない");
  await page.getByRole("button", { name: "送信" }).click();

  const userBubble = page.locator(".chat-bubble-primary").filter({ hasText: "これは見出しではない" });
  await expect(userBubble).toContainText("# これは見出しではない");
  await expect(userBubble.getByRole("heading")).toHaveCount(0);
});

test("対話が完了すると見直し案が種別ごとに表示され、押すと予算と目標に反映される", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "気になる点を探す" }).click();
  await page.getByRole("button", { name: "外食費が先月より増えています" }).click();
  await page.getByRole("button", { name: "外食が増えたかも" }).click();
  await page.getByRole("button", { name: "来月は減らしたい" }).click();

  await expect(page.getByText("食費の予算を見直しましょう")).toBeVisible();
  await expect(page.getByText("見直し案", { exact: true })).toBeVisible();

  // 貯蓄・積立がカテゴリ予算ではなく、それぞれの反映先とともに表示される
  const advice = page.getByTestId("ai-advice");
  await expect(advice.getByText("食費", { exact: true })).toBeVisible();
  await expect(advice.getByText("目標貯蓄額", { exact: true })).toBeVisible();
  await expect(advice.getByText("特別費積立", { exact: true })).toBeVisible();
  await expect(advice.getByText("家計の目標の貯蓄額に反映されます")).toBeVisible();

  await page.getByRole("button", { name: "この見直し案を予算ページに適用する" }).click();
  await expect(page.getByText("予算に反映しました")).toBeVisible();

  // 予算はカテゴリ予算に、貯蓄・積立は家計の目標に反映される
  await openBudget(page);
  await expect(page.getByLabel("食費の月間予算額")).toHaveValue("35,000");

  const goalSettings = page.getByTestId("goal-settings");
  await expect(goalSettings.getByLabel("目標貯蓄額")).toHaveValue("100,000");
  await expect(goalSettings.getByLabel("特別費積立")).toHaveValue("15,000");
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
