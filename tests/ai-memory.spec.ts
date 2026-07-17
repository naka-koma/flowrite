import { test, expect } from "@playwright/test";
import { openAiScreen, openTransactionList } from "./helpers";

test("AIアドバイスで「覚えておく」を押すと、AIページのメモリに気づきが追加される", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "気になる点を探す" }).click();
  await page.getByRole("button", { name: "外食費が先月より増えています" }).click();
  await expect(page.getByText("今月は先月より支出が増えていますね")).toBeVisible();

  await page.getByRole("button", { name: "覚えておく" }).click();
  await expect(page.getByText("記憶しました")).toBeVisible();

  await openAiScreen(page);
  const insightsSection = page.getByTestId("ai-memory-insights");
  await expect(insightsSection.getByText("今月は先月より支出が増えていますね", { exact: false })).toBeVisible();
});

test("メモリを削除できる（2段階確認）", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "気になる点を探す" }).click();
  await page.getByRole("button", { name: "外食費が先月より増えています" }).click();
  await page.getByRole("button", { name: "覚えておく" }).click();
  await expect(page.getByText("記憶しました")).toBeVisible();

  await openAiScreen(page);
  const insightsSection = page.getByTestId("ai-memory-insights");
  await expect(insightsSection.getByText("今月は先月より支出が増えていますね", { exact: false })).toBeVisible();

  await insightsSection.getByRole("button", { name: "削除" }).click();
  await expect(insightsSection.getByText("今月は先月より支出が増えていますね", { exact: false })).toBeVisible();

  await insightsSection.getByRole("button", { name: "本当に削除" }).click();

  await expect(insightsSection.getByText("今月は先月より支出が増えていますね", { exact: false })).not.toBeVisible();
  await expect(insightsSection.getByText("まだ記憶はありません")).toBeVisible();
});

async function openAiSuggestions(page: import("@playwright/test").Page) {
  await page.goto("/");
  await openTransactionList(page);
  await page.getByRole("button", { name: "AI分類提案" }).click();
  return page.getByTestId("ai-category-suggestions");
}

test("分類提案の承認時に「記憶する」を選ぶと、AIページのメモリに分類パターンが追加される", async ({ page }) => {
  const panel = await openAiSuggestions(page);
  await panel.getByRole("button", { name: "提案を取得" }).click();

  const targetRow = panel.getByRole("row").filter({ hasText: "娯楽 / 映画" }).first();
  const content = await targetRow.locator("td").nth(2).textContent();

  await targetRow.getByLabel(`${content}のパターンを記憶する`).check();
  await panel.getByRole("button", { name: /選択した項目を適用/ }).click();
  await expect(panel.getByText(/件を適用しました/)).toBeVisible();

  await openAiScreen(page);
  const categoryPatternsSection = page.getByTestId("ai-memory-category-patterns");
  await expect(categoryPatternsSection.getByText("→ 娯楽:映画", { exact: false })).toBeVisible();
});

test("適用チェックを外すと「記憶する」チェックボックスも無効化される", async ({ page }) => {
  const panel = await openAiSuggestions(page);
  await panel.getByRole("button", { name: "提案を取得" }).click();

  const targetRow = panel.getByRole("row").filter({ hasText: "娯楽 / 映画" }).first();
  const content = await targetRow.locator("td").nth(2).textContent();

  await targetRow.getByLabel(`${content}の提案を選択`).uncheck();

  await expect(targetRow.getByLabel(`${content}のパターンを記憶する`)).toBeDisabled();
});
