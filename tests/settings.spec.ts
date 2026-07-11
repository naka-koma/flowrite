import { test, expect } from "@playwright/test";
import { openSettings } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await openSettings(page);
});

test("デフォルトのプロンプトが表示される", async ({ page }) => {
  await expect(page.getByLabel("プロンプト")).toHaveValue(/家計管理のアドバイザー/);
  await expect(page.getByLabel("使用モデル")).toHaveValue("");
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
  await page.getByRole("button", { name: "保存" }).click();
  await expect(page.getByText("保存しました")).toBeVisible();

  await page.reload();
  await openSettings(page);

  await expect(page.getByLabel("プロンプト")).toHaveValue("節約志向で厳しめにアドバイスしてください。");
  await expect(page.getByLabel("使用モデル")).toHaveValue("gemini-3.5-flash");
});
