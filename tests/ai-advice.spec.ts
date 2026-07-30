import { test, expect } from "@playwright/test";
import { openBudget } from "./helpers";

// 対話は入口の候補ボタンまたは自由入力から始まる（期間の選択は不要）
async function startChat(page: import("@playwright/test").Page, topic = "今月のざっくり振り返り") {
  await page.goto("/");
  await page.getByRole("button", { name: topic }).click();
}

test("相談テーマを選ぶと対話が始まり、最初のAIメッセージとquick_repliesが表示される", async ({ page }) => {
  await startChat(page);

  await expect(page.getByText("今月は先月より支出が増えていますね")).toBeVisible();
  await expect(page.getByRole("button", { name: "外食が増えたかも" })).toBeVisible();
  await expect(page.getByRole("button", { name: "特に思い当たらない" })).toBeVisible();
});

test("自由入力からも対話を始められる", async ({ page }) => {
  await page.goto("/");

  const advice = page.getByTestId("ai-advice");
  await expect(advice.getByLabel("相談したいこと")).toBeVisible();
  await advice.getByLabel("相談したいこと").fill("年末の使いすぎを見直したい");
  await advice.getByRole("button", { name: "相談する" }).click();

  await expect(page.getByText("今月は先月より支出が増えていますね")).toBeVisible();
});

test("対話開始前は期間セレクタが表示されない", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByLabel("AIアドバイス対象年月")).not.toBeVisible();
  await expect(page.getByLabel("AIアドバイス対象年")).not.toBeVisible();
  await expect(page.getByRole("button", { name: "気になる点を探す" })).not.toBeVisible();
});

test("AIが参照したデータが回答の根拠として表示される", async ({ page }) => {
  await startChat(page);

  const toolCalls = page.getByTestId("ai-tool-calls").first();
  await expect(toolCalls.getByText("2025年12月の収支を確認")).toBeVisible();
  await expect(toolCalls.getByText("月次の推移を確認")).toBeVisible();

  // ターンごとに、そのターンで調べた内容だけが表示される
  await page.getByRole("button", { name: "外食が増えたかも" }).click();
  await expect(page.getByTestId("ai-tool-calls")).toHaveCount(2);
  await expect(page.getByTestId("ai-tool-calls").nth(1)).toContainText("2025年12月の明細（10,000円以上）を確認");
});

test("データを調べなかったターンには根拠の表示が出ない", async ({ page }) => {
  await startChat(page);
  await page.getByRole("button", { name: "外食が増えたかも" }).click();
  await page.getByRole("button", { name: "来月は減らしたい" }).click();

  await expect(page.getByText("食費の予算を見直しましょう")).toBeVisible();
  // 3ターン目はtool_callsが空のため、根拠の表示は2件のまま増えない
  await expect(page.getByTestId("ai-tool-calls")).toHaveCount(2);
});

test("quick_replyを選ぶと対話が進む", async ({ page }) => {
  await startChat(page);
  await page.getByRole("button", { name: "外食が増えたかも" }).click();

  await expect(page.getByText("なるほど、外食が増えているんですね")).toBeVisible();
  await expect(page.getByRole("button", { name: "来月は減らしたい" })).toBeVisible();
});

test("AIの応答がMarkdownとして描画され、改行が文字として残らない", async ({ page }) => {
  await startChat(page);
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
  await startChat(page);

  await page.getByLabel("AIへの返信").fill("# これは見出しではない");
  await page.getByRole("button", { name: "送信" }).click();

  const userBubble = page.locator(".chat-bubble-primary").filter({ hasText: "これは見出しではない" });
  await expect(userBubble).toContainText("# これは見出しではない");
  await expect(userBubble.getByRole("heading")).toHaveCount(0);
});

test("対話が完了すると見直し案が種別ごとに表示され、押すと予算と目標に反映される", async ({ page }) => {
  await startChat(page);
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

test("自由入力の返信を送信できる", async ({ page }) => {
  await startChat(page);

  await page.getByLabel("AIへの返信").fill("実は副業の経費が増えました");
  await page.getByRole("button", { name: "送信" }).click();

  await expect(page.getByText("実は副業の経費が増えました")).toBeVisible();
  await expect(page.getByText("なるほど、外食が増えているんですね")).toBeVisible();
  // 送信後は入力欄が空に戻り、続けて質問できる
  await expect(page.getByLabel("AIへの返信")).toHaveValue("");
});

test("見直し案が出た後も対話を続けられる", async ({ page }) => {
  await startChat(page);
  await page.getByRole("button", { name: "外食が増えたかも" }).click();
  await page.getByRole("button", { name: "来月は減らしたい" }).click();

  await expect(page.getByText("見直し案", { exact: true })).toBeVisible();
  // 結論が出た後も返信欄が残っている
  await expect(page.getByLabel("AIへの返信")).toBeVisible();

  await page.getByLabel("AIへの返信").fill("交通費の平均はいくら？");
  await page.getByRole("button", { name: "送信" }).click();

  await expect(page.getByText("交通費の平均は月58,000円だよ")).toBeVisible();
  await expect(page.getByLabel("AIへの返信")).toBeVisible();
});

test("見直し案を適用すると適用ボタンが消え、二重に反映できない", async ({ page }) => {
  await startChat(page);
  await page.getByRole("button", { name: "外食が増えたかも" }).click();
  await page.getByRole("button", { name: "来月は減らしたい" }).click();

  const applyButton = page.getByRole("button", { name: "この見直し案を予算ページに適用する" });
  await applyButton.click();

  await expect(page.getByText("予算に反映しました")).toBeVisible();
  await expect(applyButton).not.toBeVisible();
});

test("AIのメッセージを「覚えておく」で記憶できる", async ({ page }) => {
  await startChat(page);
  await expect(page.getByText("今月は先月より支出が増えていますね")).toBeVisible();

  await page.getByRole("button", { name: "覚えておく" }).click();

  await expect(page.getByText("記憶しました")).toBeVisible();
});

test("「覚えておく」を押すと処理中であることが分かる", async ({ page }) => {
  await startChat(page);
  await page.getByRole("button", { name: "外食が増えたかも" }).click();
  await expect(page.getByText("なるほど、外食が増えているんですね")).toBeVisible();

  // 2件目のAIメッセージを記憶する
  await page.getByRole("button", { name: "覚えておく" }).nth(1).click();

  // 要約のためのサーバー往復が入るため、その間は処理中と分かる
  await expect(page.getByText("記憶しています...")).toBeVisible();
  // 押したメッセージだけが処理中になり、1件目は「覚えておく」のまま
  await expect(page.getByRole("button", { name: "覚えておく" })).toHaveCount(1);

  await expect(page.getByText("記憶しました")).toBeVisible();
  await expect(page.getByText("記憶しています...")).not.toBeVisible();
});

test("「最初からやり直す」で入口に戻る", async ({ page }) => {
  await startChat(page);
  await expect(page.getByText("今月は先月より支出が増えていますね")).toBeVisible();

  await page.getByRole("button", { name: "最初からやり直す" }).click();

  await expect(page.getByLabel("相談したいこと")).toBeVisible();
  await expect(page.getByText("今月は先月より支出が増えていますね")).not.toBeVisible();
});

test("対話の開始に失敗するとエラーメッセージが表示される", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __MOCK_SCENARIO__: unknown }).__MOCK_SCENARIO__ = { aiChatError: true };
  });
  await startChat(page);

  await expect(page.getByText("エラー: GEMINI_API_KEY is not set in script properties")).toBeVisible();
});
