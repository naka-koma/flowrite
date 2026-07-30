import { test, expect } from "@playwright/test";

async function sendFreeText(page: import("@playwright/test").Page, text: string) {
  await page.getByLabel("AIへの返信").fill(text);
  await page.getByRole("button", { name: "送信" }).click();
}

test("短い対話では折りたたみトグルが表示されない", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "今月のざっくり振り返り" }).click();
  await expect(page.getByText("今月は先月より支出が増えていますね")).toBeVisible();

  await expect(page.getByTestId("chat-history-toggle")).not.toBeVisible();
});

test("対話中に手動で過去のやり取りを折りたたみ・再表示できる", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "今月のざっくり振り返り" }).click();
  await page.getByRole("button", { name: "外食が増えたかも" }).click();
  await page.getByRole("button", { name: "来月は減らしたい" }).click();
  await expect(page.getByText("食費の予算を見直しましょう")).toBeVisible();

  // 6メッセージ（3往復）ある状態。手動でいつでも畳める
  const advice = page.getByTestId("ai-advice");
  await expect(advice.getByText("今月は先月より支出が増えていますね")).toBeVisible();

  const toggle = page.getByTestId("chat-history-toggle");
  await expect(toggle).toHaveText(/過去のやり取りを折りたたむ/);
  await toggle.click();

  // 古いメッセージは隠れ、直近のやり取りは残る
  await expect(advice.getByText("今月は先月より支出が増えていますね")).not.toBeVisible();
  await expect(advice.getByText("食費の予算を見直しましょう")).toBeVisible();
  await expect(toggle).toHaveText(/過去のやり取りを表示する/);

  // 再表示すると元通り見える
  await toggle.click();
  await expect(advice.getByText("今月は先月より支出が増えていますね")).toBeVisible();
});

test("長い履歴を復元した直後は自動で折りたたまれる", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "今月のざっくり振り返り" }).click();
  await page.getByRole("button", { name: "外食が増えたかも" }).click();
  await page.getByRole("button", { name: "来月は減らしたい" }).click();
  await expect(page.getByText("食費の予算を見直しましょう")).toBeVisible();

  // さらにやり取りを重ねて履歴を伸ばす
  await sendFreeText(page, "交通費の平均はいくら？");
  await expect(page.getByText("交通費の平均は月58,000円だよ")).toBeVisible();
  await sendFreeText(page, "もう一度教えて");
  await expect(page.getByTestId("chat-history-toggle")).toBeVisible();

  await page.reload();

  // 復元直後は自動で折りたたまれ、最初のメッセージは見えない
  const advice = page.getByTestId("ai-advice");
  const toggle = page.getByTestId("chat-history-toggle");
  await expect(toggle).toHaveText(/過去のやり取りを表示する/);
  await expect(advice.getByText("今月は先月より支出が増えていますね")).not.toBeVisible();
  // 直近のやり取りは表示されている（2回同じ質問をしたため同じ応答が2件ある）
  await expect(advice.getByText("交通費の平均は月58,000円だよ").first()).toBeVisible();

  // トグルで展開すれば全て見える
  await toggle.click();
  await expect(advice.getByText("今月は先月より支出が増えていますね")).toBeVisible();
});
