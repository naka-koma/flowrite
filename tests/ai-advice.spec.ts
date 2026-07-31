import { test, expect } from "@playwright/test";
import { openAiScreen, openBudget, openTransactionList } from "./helpers";

// 対話は入口の候補ボタンまたは自由入力から始まる（期間の選択は不要）
async function startChat(page: import("@playwright/test").Page, topic = "今月のざっくり振り返り") {
  await page.goto("/");
  await openAiScreen(page);
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
  await openAiScreen(page);

  const advice = page.getByTestId("ai-advice");
  await expect(advice.getByLabel("相談したいこと")).toBeVisible();
  await advice.getByLabel("相談したいこと").fill("年末の使いすぎを見直したい");
  await advice.getByRole("button", { name: "相談する" }).click();

  await expect(page.getByText("今月は先月より支出が増えていますね")).toBeVisible();
});

test("対話開始前は期間セレクタが表示されない", async ({ page }) => {
  await page.goto("/");
  await openAiScreen(page);

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
  await expect(bubble.locator("strong", { hasText: "食費全体" })).toBeVisible();

  // エスケープされた改行が文字として表示されていない
  await expect(bubble).not.toContainText("\\n");
  await expect(bubble).not.toContainText("##");

  // GFMの表がtable要素として描画される
  const table = bubble.locator("table");
  await expect(table).toBeVisible();
  await expect(table.locator("th", { hasText: "今月" })).toBeVisible();
  await expect(table.locator("td", { hasText: "30,000円" })).toBeVisible();
});

test("ユーザーへの返信は複数行の改行を含めて送信できる", async ({ page }) => {
  await startChat(page);

  const textarea = page.getByLabel("AIへの返信");
  await textarea.fill("1行目\n2行目");
  await page.getByRole("button", { name: "送信" }).click();

  const userBubble = page.locator(".chat-bubble-primary").filter({ hasText: "1行目" });
  await expect(userBubble).toBeVisible();
  await expect(userBubble).toHaveJSProperty("innerText", "1行目\n2行目");
});

test("ユーザーの発言はMarkdownとして描画されない", async ({ page }) => {
  await startChat(page);

  await page.getByLabel("AIへの返信").fill("# これは見出しではない");
  await page.getByRole("button", { name: "送信" }).click();

  const userBubble = page.locator(".chat-bubble-primary").filter({ hasText: "これは見出しではない" });
  await expect(userBubble).toContainText("# これは見出しではない");
  await expect(userBubble.getByRole("heading")).toHaveCount(0);
});

test("対話中に見つかった分類の見直し案を選んで反映できる", async ({ page }) => {
  await startChat(page);
  await page.getByRole("button", { name: "外食が増えたかも" }).click();

  const advice = page.getByTestId("ai-advice");
  await expect(advice.getByText("分類の見直し案", { exact: true })).toBeVisible();
  await expect(advice.getByText("店舗4")).toBeVisible();
  await expect(advice.getByText("その他:雑費 → 食費:外食")).toBeVisible();

  // 既定で全件チェック済みなので、そのまま反映できる
  await advice.getByRole("button", { name: "選択した分類を反映する" }).click();
  await expect(advice.getByText("分類を更新しました")).toBeVisible();

  // 実際に取引一覧側の分類も変わっている
  await openTransactionList(page);
  await page.getByLabel("対象年月").selectOption("2025-12");
  const row = page.getByRole("row").filter({ has: page.getByRole("cell", { name: "店舗4", exact: true }) });
  await expect(row.getByLabel("大項目")).toHaveValue("食費");
  await expect(row.getByLabel("中項目")).toHaveValue("外食");
});

test("チェックを外した分類は反映対象から外れる", async ({ page }) => {
  await startChat(page);
  await page.getByRole("button", { name: "外食が増えたかも" }).click();

  const advice = page.getByTestId("ai-advice");
  const checkbox = advice.getByLabel("店舗4の分類を変更する");
  await expect(checkbox).toBeChecked();

  await checkbox.uncheck();
  await expect(advice.getByRole("button", { name: "選択した分類を反映する" })).toBeDisabled();
});

test("対話が完了すると見直し案が種別ごとに表示され、項目ごとに個別で反映できる", async ({ page }) => {
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

  // 「食費」だけを適用する。一括ではなく項目ごとに個別適用できる
  const foodItem = advice.getByRole("listitem").filter({ hasText: "食費" });
  await foodItem.getByRole("button", { name: "適用する" }).click();
  await expect(foodItem.getByText("適用済み")).toBeVisible();

  // 他の項目はまだ未適用のまま残っている
  const savingsItem = advice.getByRole("listitem").filter({ hasText: "目標貯蓄額" });
  await expect(savingsItem.getByRole("button", { name: "適用する" })).toBeVisible();

  // 適用した食費だけが予算に反映され、目標側はまだ変わっていない
  await openBudget(page);
  await expect(page.getByLabel("食費の月間予算額")).toHaveValue("35,000");

  const goalSettings = page.getByTestId("goal-settings");
  await expect(goalSettings.getByLabel("目標貯蓄額")).toHaveValue("");
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

test("項目を適用するとその項目だけ「適用済み」になり、二重に反映できない", async ({ page }) => {
  await startChat(page);
  await page.getByRole("button", { name: "外食が増えたかも" }).click();
  await page.getByRole("button", { name: "来月は減らしたい" }).click();

  const advice = page.getByTestId("ai-advice");
  const foodItem = advice.getByRole("listitem").filter({ hasText: "食費" });
  const applyButton = foodItem.getByRole("button", { name: "適用する" });
  await applyButton.click();

  await expect(foodItem.getByText("適用済み")).toBeVisible();
  await expect(applyButton).not.toBeVisible();
});

test("他の項目を適用中は、別の項目の適用ボタンが押せない", async ({ page }) => {
  await startChat(page);
  await page.getByRole("button", { name: "外食が増えたかも" }).click();
  await page.getByRole("button", { name: "来月は減らしたい" }).click();

  const advice = page.getByTestId("ai-advice");
  const foodItem = advice.getByRole("listitem").filter({ hasText: "食費" });
  const savingsItem = advice.getByRole("listitem").filter({ hasText: "目標貯蓄額" });

  await foodItem.getByRole("button", { name: "適用する" }).click();
  await expect(savingsItem.getByRole("button", { name: "適用する" })).toBeDisabled();

  await expect(foodItem.getByText("適用済み")).toBeVisible();
  await expect(savingsItem.getByRole("button", { name: "適用する" })).toBeEnabled();
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

test("対話の開始に失敗しても入口に留まり、再度試せる", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __MOCK_SCENARIO__: unknown }).__MOCK_SCENARIO__ = { aiChatError: true };
  });
  await startChat(page);

  await expect(page.getByText("エラー: GEMINI_API_KEY is not set in script properties")).toBeVisible();
  // 会話が存在しないため「やり直す」を挟まなくても、入口の候補ボタンからそのまま再挑戦できる
  await expect(page.getByRole("button", { name: "今月のざっくり振り返り" })).toBeVisible();

  await page.evaluate(() => {
    (window as unknown as { __MOCK_SCENARIO__: { aiChatError: boolean } }).__MOCK_SCENARIO__.aiChatError = false;
  });
  await page.getByRole("button", { name: "今月のざっくり振り返り" }).click();

  await expect(page.getByText("今月は先月より支出が増えていますね")).toBeVisible();
});

test("対話中に返信が失敗しても会話は保持され、そのまま再送できる", async ({ page }) => {
  await startChat(page);
  await expect(page.getByText("今月は先月より支出が増えていますね")).toBeVisible();

  await page.evaluate(() => {
    (window as unknown as { __MOCK_SCENARIO__: { aiContinueChatError: boolean } }).__MOCK_SCENARIO__ = {
      aiContinueChatError: true,
    } as never;
  });
  await page.getByRole("button", { name: "外食が増えたかも" }).click();

  await expect(page.getByText("エラー: Gemini API request failed")).toBeVisible();
  // 失敗前のメッセージとquick_repliesは消えず、返信欄も残っている
  await expect(page.getByText("今月は先月より支出が増えていますね")).toBeVisible();
  await expect(page.getByRole("button", { name: "外食が増えたかも" })).toBeVisible();
  await expect(page.getByLabel("AIへの返信")).toBeVisible();

  await page.evaluate(() => {
    (window as unknown as { __MOCK_SCENARIO__: { aiContinueChatError: boolean } }).__MOCK_SCENARIO__.aiContinueChatError =
      false;
  });
  await page.getByRole("button", { name: "外食が増えたかも" }).click();

  await expect(page.getByText("なるほど、外食が増えているんですね")).toBeVisible();
  await expect(page.getByText("エラー: Gemini API request failed")).not.toBeVisible();
});

test("自由入力の送信が失敗しても入力内容は消えず、再送できる", async ({ page }) => {
  await startChat(page);
  await page.evaluate(() => {
    (window as unknown as { __MOCK_SCENARIO__: { aiContinueChatError: boolean } }).__MOCK_SCENARIO__ = {
      aiContinueChatError: true,
    } as never;
  });

  await page.getByLabel("AIへの返信").fill("実は副業の経費が増えました");
  await page.getByRole("button", { name: "送信" }).click();

  await expect(page.getByText("エラー: Gemini API request failed")).toBeVisible();
  // 送信に失敗したので入力内容は消えず、打ち直さずに再送できる
  await expect(page.getByLabel("AIへの返信")).toHaveValue("実は副業の経費が増えました");

  await page.evaluate(() => {
    (window as unknown as { __MOCK_SCENARIO__: { aiContinueChatError: boolean } }).__MOCK_SCENARIO__.aiContinueChatError =
      false;
  });
  await page.getByRole("button", { name: "送信" }).click();

  await expect(page.getByText("実は副業の経費が増えました")).toBeVisible();
  await expect(page.getByLabel("AIへの返信")).toHaveValue("");
});
