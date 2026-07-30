import { test, expect } from "@playwright/test";
import { openAiScreen, openBudget } from "./helpers";

test("対話後にリロードすると、続きから自動で再開される", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "今月のざっくり振り返り" }).click();
  await page.getByRole("button", { name: "外食が増えたかも" }).click();
  await expect(page.getByText("なるほど、外食が増えているんですね")).toBeVisible();

  await page.reload();

  // 「続きから」ボタンを押す必要なく、開いた瞬間に対話が復元される
  const advice = page.getByTestId("ai-advice");
  await expect(advice.getByText("今月は先月より支出が増えていますね")).toBeVisible();
  await expect(advice.getByText("なるほど、外食が増えているんですね")).toBeVisible();
  await expect(advice.getByRole("button", { name: "来月は減らしたい" })).toBeVisible();
});

test("画面を離れてAIページに戻っても、続きから再開される", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "今月のざっくり振り返り" }).click();
  await expect(page.getByText("今月は先月より支出が増えていますね")).toBeVisible();

  await openBudget(page);
  await openAiScreen(page);

  await expect(page.getByTestId("ai-advice").getByText("今月は先月より支出が増えていますね")).toBeVisible();
});

test("「最初からやり直す」で保存された対話も破棄され、リロードしても入口画面になる", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "今月のざっくり振り返り" }).click();
  await expect(page.getByText("今月は先月より支出が増えていますね")).toBeVisible();

  await page.getByRole("button", { name: "最初からやり直す" }).click();
  await expect(page.getByLabel("相談したいこと")).toBeVisible();

  await page.reload();

  // 保存分が削除されているため、入口画面（保存済み対話なし）に戻る
  const advice = page.getByTestId("ai-advice");
  await expect(advice.getByLabel("相談したいこと")).toBeVisible();
  await expect(advice.getByText("今月は先月より支出が増えていますね")).not.toBeVisible();
});

test("保存APIが失敗しても対話は継続できる", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __MOCK_SCENARIO__: unknown }).__MOCK_SCENARIO__ = { aiSaveSessionError: true };
  });
  await page.goto("/");
  await page.getByRole("button", { name: "今月のざっくり振り返り" }).click();
  await expect(page.getByText("今月は先月より支出が増えていますね")).toBeVisible();

  // 保存に失敗していても、対話自体は次のターンに進める
  await page.getByRole("button", { name: "外食が増えたかも" }).click();
  await expect(page.getByText("なるほど、外食が増えているんですね")).toBeVisible();
});

test("何も保存されていない場合は、通常通り入口画面が表示される", async ({ page }) => {
  await page.goto("/");

  const advice = page.getByTestId("ai-advice");
  await expect(advice.getByLabel("相談したいこと")).toBeVisible();
});
