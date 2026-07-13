import { test, expect } from "@playwright/test";
import { openSettings } from "./helpers";

test("設定画面にカテゴリマスタの一覧が表示される", async ({ page }) => {
  await page.goto("/");
  await openSettings(page);

  await expect(page.getByText("食費: 外食、スーパー、コンビニ")).toBeVisible();
});

test("設定画面からカテゴリマスタに新しいペアを追加できる", async ({ page }) => {
  await page.goto("/");
  await openSettings(page);

  const categorySettings = page.getByTestId("category-settings");
  await categorySettings.getByLabel("新しい大項目").fill("特別費");
  await categorySettings.getByLabel("新しい中項目").fill("旅行");
  await categorySettings.getByRole("button", { name: "追加" }).click();

  await expect(page.getByText("特別費: 旅行")).toBeVisible();
});

test("大項目をリネームできる", async ({ page }) => {
  await page.goto("/");
  await openSettings(page);

  const categorySettings = page.getByTestId("category-settings");
  await categorySettings.getByRole("button", { name: "編集" }).first().click();
  await categorySettings.getByLabel("食費の新しい大項目名").fill("食費(新)");
  await categorySettings.getByRole("button", { name: "保存" }).click();

  await expect(page.getByText("食費(新): 外食、スーパー、コンビニ")).toBeVisible();
});

test("大項目は1回目のクリックでは削除されず、確認後に削除される", async ({ page }) => {
  await page.goto("/");
  await openSettings(page);

  const categorySettings = page.getByTestId("category-settings");
  const row = categorySettings.locator("li").filter({ hasText: "娯楽: 映画、書籍" });
  await row.getByRole("button", { name: "削除" }).click();
  await expect(page.getByText("娯楽: 映画、書籍")).toBeVisible();

  await row.getByRole("button", { name: "本当に削除" }).click();
  await expect(page.getByText("娯楽: 映画、書籍")).not.toBeVisible();
});
