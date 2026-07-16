import { test, expect } from "@playwright/test";
import { openAiScreen } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await openAiScreen(page);
});

test("デフォルトのプロンプト・相談テーマが表示される", async ({ page }) => {
  await expect(page.getByLabel("プロンプト")).toHaveValue(/家計管理のアドバイザー/);
  await expect(page.getByLabel("使用モデル")).toHaveValue("");
  await expect(page.getByLabel("相談テーマ")).toHaveValue(/今月のざっくり振り返り/);
});

test("プロンプト・使用モデルを編集して保存できる", async ({ page }) => {
  await page.getByLabel("プロンプト").fill("節約志向で厳しめにアドバイスしてください。");
  await page.getByLabel("使用モデル").fill("gemini-3.5-flash");
  await page.getByRole("button", { name: "保存" }).click();

  await expect(page.getByText("保存しました")).toBeVisible();
});

test("保存した内容が再読み込み後も反映される", async ({ page }) => {
  await page.getByLabel("プロンプト").fill("節約志向で厳しめにアドバイスしてください。");
  await page.getByLabel("使用モデル").fill("gemini-3.5-flash");
  await page.getByLabel("相談テーマ").fill("今月の振り返り\n来月の作戦会議");
  await page.getByRole("button", { name: "保存" }).click();
  await expect(page.getByText("保存しました")).toBeVisible();

  await page.reload();
  await openAiScreen(page);

  await expect(page.getByLabel("プロンプト")).toHaveValue("節約志向で厳しめにアドバイスしてください。");
  await expect(page.getByLabel("使用モデル")).toHaveValue("gemini-3.5-flash");
  await expect(page.getByLabel("相談テーマ")).toHaveValue("今月の振り返り\n来月の作戦会議");
});
