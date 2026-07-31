import { test, expect } from "@playwright/test";
import { openTransactionList } from "./helpers";

async function openAiSuggestions(page: import("@playwright/test").Page) {
  await page.goto("/");
  await openTransactionList(page);
  await page.getByRole("button", { name: "AI分類提案" }).click();
  return page.getByTestId("ai-category-suggestions");
}

test("AI分類提案ボタンからスコープ選択・提案取得ができる", async ({ page }) => {
  const panel = await openAiSuggestions(page);

  await expect(panel.getByText("未分類のみ")).toBeVisible();
  await expect(panel.getByText("選択中の年月の全件")).toBeVisible();

  await panel.getByRole("button", { name: "提案を取得" }).click();

  await expect(panel.getByRole("columnheader", { name: "提案分類" })).toBeVisible();
});

test("提案取得後はデフォルトで全件チェック済みになっている", async ({ page }) => {
  const panel = await openAiSuggestions(page);
  await panel.getByRole("button", { name: "提案を取得" }).click();

  await expect(panel.getByLabel("すべて選択")).toBeChecked();
  const checkboxes = panel.getByRole("row").getByRole("checkbox", { name: /の提案を選択$/ });
  const count = await checkboxes.count();
  for (let i = 0; i < count; i++) {
    await expect(checkboxes.nth(i)).toBeChecked();
  }
});

test("変更ありのみ表示をオンにすると、現在の分類と同じ提案が除外される", async ({ page }) => {
  const panel = await openAiSuggestions(page);
  await panel.getByRole("button", { name: "提案を取得" }).click();
  await expect(panel.getByRole("columnheader", { name: "提案分類" })).toBeVisible();

  const rowsBefore = await panel.locator("tbody tr").count();
  await expect(panel.getByRole("row").filter({ hasText: "店舗2" })).toBeVisible();

  await panel.getByLabel("変更ありのみ表示").check();

  await expect(panel.locator("tbody tr")).toHaveCount(rowsBefore - 1);
  await expect(panel.getByRole("row").filter({ hasText: "店舗2" })).not.toBeVisible();

  await panel.getByLabel("変更ありのみ表示").uncheck();
  await expect(panel.locator("tbody tr")).toHaveCount(rowsBefore);
});

test("現在の分類と異なる提案の行は強調表示される", async ({ page }) => {
  const panel = await openAiSuggestions(page);
  await panel.getByRole("button", { name: "提案を取得" }).click();
  await expect(panel.getByRole("columnheader", { name: "提案分類" })).toBeVisible();

  const changedRow = panel.getByRole("row").filter({ hasText: "店舗0" });
  const unchangedRow = panel.getByRole("row").filter({ hasText: "店舗2" });

  await expect(changedRow).toHaveClass(/bg-warning/);
  await expect(unchangedRow).toBeVisible();
  const unchangedClass = await unchangedRow.getAttribute("class");
  expect(unchangedClass ?? "").not.toContain("bg-warning");
});

test("一部の提案だけ選択して適用すると、選択した行のみ分類が変わる", async ({ page }) => {
  const panel = await openAiSuggestions(page);
  await panel.getByRole("button", { name: "提案を取得" }).click();
  await expect(panel.getByRole("columnheader", { name: "提案分類" })).toBeVisible();

  const rows = panel.getByRole("row").filter({ hasText: "娯楽 / 映画" });
  const rowCount = await rows.count();
  expect(rowCount).toBeGreaterThan(1);

  // 2件目以降のチェックを外し、1件目だけ適用する
  for (let i = 1; i < rowCount; i++) {
    await rows.nth(i).getByRole("checkbox", { name: /の提案を選択$/ }).uncheck();
  }

  const firstRowContent = await rows.nth(0).locator("td").nth(2).textContent();

  await panel.getByRole("button", { name: /選択した項目を適用/ }).click();
  await expect(panel.getByText(/件を適用しました/)).toBeVisible();

  const updatedRow = page.getByRole("row").filter({ hasText: firstRowContent ?? "" });
  await expect(updatedRow.getByLabel("大項目")).toHaveValue("娯楽");
});

test("適用後、対象行のロックがONになる", async ({ page }) => {
  const panel = await openAiSuggestions(page);
  await panel.getByRole("button", { name: "提案を取得" }).click();

  const targetRow = panel.getByRole("row").filter({ hasText: "娯楽 / 映画" }).first();
  const content = await targetRow.locator("td").nth(2).textContent();

  await panel.getByRole("button", { name: /選択した項目を適用/ }).click();
  await expect(panel.getByText(/件を適用しました/)).toBeVisible();

  const updatedRow = page.getByRole("row").filter({ hasText: content ?? "" });
  await expect(updatedRow.getByLabel("ロック")).toBeChecked();
});

test("対象の取引がない場合はメッセージが表示される", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __MOCK_SCENARIO__?: { aiCategorySuggestionsEmpty?: boolean } }).__MOCK_SCENARIO__ = {
      aiCategorySuggestionsEmpty: true,
    };
  });
  const panel = await openAiSuggestions(page);
  await panel.getByRole("button", { name: "提案を取得" }).click();

  await expect(panel.getByText("対象の取引がありません")).toBeVisible();
});

test("APIキー未設定エラー時はエラーメッセージが表示される", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __MOCK_SCENARIO__?: { aiCategorySuggestionsError?: boolean } }).__MOCK_SCENARIO__ = {
      aiCategorySuggestionsError: true,
    };
  });
  const panel = await openAiSuggestions(page);
  await panel.getByRole("button", { name: "提案を取得" }).click();

  await expect(panel.getByRole("alert")).toContainText("GEMINI_API_KEY");
});

test("大項目・中項目で絞り込むと該当ペアの提案のみ返る", async ({ page }) => {
  const panel = await openAiSuggestions(page);
  await panel.getByRole("radio", { name: "選択中の年月の全件" }).check();
  await panel.getByRole("button", { name: /絞り込み条件/ }).click();
  await panel.locator("label").filter({ hasText: "映画" }).getByRole("checkbox").check();
  await panel.getByRole("button", { name: "提案を取得" }).click();
  await expect(panel.getByRole("columnheader", { name: "提案分類" })).toBeVisible();

  const totalRows = await panel.locator("tbody tr").count();
  expect(totalRows).toBeGreaterThan(0);
  const matchingRows = panel.getByRole("row").filter({ hasText: "娯楽 / 映画" });
  await expect(matchingRows).toHaveCount(totalRows);
});

test("大項目チェックボックスで配下の中項目を一括選択できる", async ({ page }) => {
  const panel = await openAiSuggestions(page);
  await panel.getByRole("radio", { name: "選択中の年月の全件" }).check();
  await panel.getByRole("button", { name: /絞り込み条件/ }).click();

  await panel.getByRole("checkbox", { name: "娯楽をすべて選択" }).check();
  await expect(panel.locator("label").filter({ hasText: "映画" }).getByRole("checkbox")).toBeChecked();
  await expect(panel.locator("label").filter({ hasText: "書籍" }).getByRole("checkbox")).toBeChecked();

  await panel.getByRole("button", { name: "提案を取得" }).click();
  await expect(panel.getByRole("columnheader", { name: "提案分類" })).toBeVisible();

  const totalRows = await panel.locator("tbody tr").count();
  expect(totalRows).toBeGreaterThan(0);
  const matchingRows = panel.getByRole("row").filter({ hasText: "娯楽" });
  await expect(matchingRows).toHaveCount(totalRows);
});

test("大項目チェックボックスで配下の中項目を一括解除できる", async ({ page }) => {
  const panel = await openAiSuggestions(page);
  await panel.getByRole("button", { name: /絞り込み条件/ }).click();

  await panel.getByRole("checkbox", { name: "娯楽をすべて選択" }).check();
  await panel.getByRole("checkbox", { name: "娯楽をすべて選択" }).uncheck();

  await expect(panel.locator("label").filter({ hasText: "映画" }).getByRole("checkbox")).not.toBeChecked();
  await expect(panel.locator("label").filter({ hasText: "書籍" }).getByRole("checkbox")).not.toBeChecked();
});

test("中項目を一部だけ選択すると大項目チェックボックスが中間状態になる", async ({ page }) => {
  const panel = await openAiSuggestions(page);
  await panel.getByRole("button", { name: /絞り込み条件/ }).click();

  await panel.locator("label").filter({ hasText: "映画" }).getByRole("checkbox").check();

  const groupCheckbox = panel.getByRole("checkbox", { name: "娯楽をすべて選択" });
  await expect(groupCheckbox).not.toBeChecked();
  const indeterminate = await groupCheckbox.evaluate((el) => (el as HTMLInputElement).indeterminate);
  expect(indeterminate).toBe(true);

  await panel.locator("label").filter({ hasText: "書籍" }).getByRole("checkbox").check();
  await expect(groupCheckbox).toBeChecked();
});

test("すべて選択/すべて解除ボタンで全大項目・中項目を一括切り替えできる", async ({ page }) => {
  const panel = await openAiSuggestions(page);
  await panel.getByRole("radio", { name: "選択中の年月の全件" }).check();
  await panel.getByRole("button", { name: /絞り込み条件/ }).click();

  await panel.getByRole("button", { name: "すべて選択" }).click();
  await expect(panel.getByRole("checkbox", { name: "娯楽をすべて選択" })).toBeChecked();
  await expect(panel.getByRole("checkbox", { name: "食費をすべて選択" })).toBeChecked();

  await panel.getByRole("button", { name: "提案を取得" }).click();
  await expect(panel.getByRole("columnheader", { name: "提案分類" })).toBeVisible();
  const totalRows = await panel.locator("tbody tr").count();
  expect(totalRows).toBeGreaterThan(0);

  await panel.getByRole("button", { name: "すべて解除" }).click();
  await expect(panel.getByRole("checkbox", { name: "娯楽をすべて選択" })).not.toBeChecked();
  await expect(panel.getByRole("checkbox", { name: "食費をすべて選択" })).not.toBeChecked();
});

test("金融機関キーワードで絞り込むと部分一致した行のみ返る", async ({ page }) => {
  const panel = await openAiSuggestions(page);
  await panel.getByRole("radio", { name: "選択中の年月の全件" }).check();
  await panel.getByRole("button", { name: /絞り込み条件/ }).click();
  await panel.getByLabel("金融機関").fill("楽天カード");
  await panel.getByRole("button", { name: "提案を取得" }).click();
  await expect(panel.getByRole("columnheader", { name: "提案分類" })).toBeVisible();

  const totalRows = await panel.locator("tbody tr").count();
  expect(totalRows).toBeGreaterThan(0);
  const matchingRows = panel.getByRole("row").filter({ hasText: "楽天カード" });
  await expect(matchingRows).toHaveCount(totalRows);
});

test("支出額の範囲で絞り込むと範囲内の金額のみ返る", async ({ page }) => {
  const panel = await openAiSuggestions(page);
  await panel.getByRole("radio", { name: "選択中の年月の全件" }).check();
  await panel.getByRole("button", { name: /絞り込み条件/ }).click();
  await panel.getByLabel("支出額(下限)").fill("2000");
  await panel.getByLabel("支出額(上限)").fill("2200");
  await panel.getByRole("button", { name: "提案を取得" }).click();
  await expect(panel.getByRole("columnheader", { name: "提案分類" })).toBeVisible();

  const amountCells = panel.locator("tbody tr td:nth-child(4)");
  const count = await amountCells.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    const text = await amountCells.nth(i).textContent();
    const amount = Math.abs(Number((text ?? "").replace(/[^0-9-]/g, "")));
    expect(amount).toBeGreaterThanOrEqual(2000);
    expect(amount).toBeLessThanOrEqual(2200);
  }
});

test("新規カテゴリの提案には未登録バッジが表示される", async ({ page }) => {
  await page.addInitScript(() => {
    (
      window as unknown as { __MOCK_SCENARIO__?: { aiCategorySuggestionsWithNewCategory?: boolean } }
    ).__MOCK_SCENARIO__ = { aiCategorySuggestionsWithNewCategory: true };
  });
  const panel = await openAiSuggestions(page);
  await panel.getByRole("button", { name: "提案を取得" }).click();

  await expect(panel.getByText("未登録")).toBeVisible();
  await expect(panel.getByText("新規テスト大項目 / 新規テスト中項目")).toBeVisible();
});

test("新規カテゴリを含む適用時は確認アラートが出て、登録して適用できる", async ({ page }) => {
  await page.addInitScript(() => {
    (
      window as unknown as { __MOCK_SCENARIO__?: { aiCategorySuggestionsWithNewCategory?: boolean } }
    ).__MOCK_SCENARIO__ = { aiCategorySuggestionsWithNewCategory: true };
  });
  const panel = await openAiSuggestions(page);
  await panel.getByRole("button", { name: "提案を取得" }).click();

  await panel.getByRole("button", { name: /選択した項目を適用/ }).click();

  await expect(panel.getByText("以下の新しいカテゴリが含まれています。登録してから適用しますか?")).toBeVisible();
  await expect(panel.getByRole("listitem").filter({ hasText: "新規テスト大項目 / 新規テスト中項目" })).toBeVisible();

  await panel.getByRole("button", { name: "新規カテゴリを登録して適用" }).click();
  await expect(panel.getByText(/件を適用しました/)).toBeVisible();
});

test("新規カテゴリ確認アラートでキャンセルすると何も適用されない", async ({ page }) => {
  await page.addInitScript(() => {
    (
      window as unknown as { __MOCK_SCENARIO__?: { aiCategorySuggestionsWithNewCategory?: boolean } }
    ).__MOCK_SCENARIO__ = { aiCategorySuggestionsWithNewCategory: true };
  });
  const panel = await openAiSuggestions(page);
  await panel.getByRole("button", { name: "提案を取得" }).click();

  await panel.getByRole("button", { name: /選択した項目を適用/ }).click();
  await expect(panel.getByText("以下の新しいカテゴリが含まれています。登録してから適用しますか?")).toBeVisible();

  await panel.getByRole("button", { name: "キャンセル" }).click();

  await expect(panel.getByText("以下の新しいカテゴリが含まれています。登録してから適用しますか?")).not.toBeVisible();
  await expect(panel.getByText(/件を適用しました/)).not.toBeVisible();
});
