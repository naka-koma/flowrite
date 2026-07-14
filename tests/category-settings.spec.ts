import { test, expect } from "@playwright/test";
import { openSettings } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await openSettings(page);
});

test("設定画面に大項目ごとにグループ化されたカテゴリが表示される", async ({ page }) => {
  const categorySettings = page.getByTestId("category-settings");
  await expect(categorySettings.getByText("食費")).toBeVisible();
  await expect(categorySettings.getByLabel("食費/外食の中項目")).toHaveValue("外食");
  await expect(categorySettings.getByLabel("食費/スーパーの中項目")).toHaveValue("スーパー");
});

test("▼をクリックすると大項目グループの開閉ができる", async ({ page }) => {
  const categorySettings = page.getByTestId("category-settings");
  await expect(categorySettings.getByLabel("食費/外食の中項目")).toBeVisible();

  await categorySettings.getByLabel("食費を開閉").click();
  await expect(categorySettings.getByLabel("食費/外食の中項目")).not.toBeVisible();

  await categorySettings.getByLabel("食費を開閉").click();
  await expect(categorySettings.getByLabel("食費/外食の中項目")).toBeVisible();
});

test("大項目を追加すると「未分類」の中項目を持つグループが作成される", async ({ page }) => {
  const categorySettings = page.getByTestId("category-settings");
  await categorySettings.getByLabel("新しい大項目").fill("特別費");
  await categorySettings.getByLabel("新しい大項目").locator("xpath=ancestor::form[1]").getByRole("button", { name: "追加" }).click();

  await expect(categorySettings.getByLabel("特別費/未分類の中項目")).toHaveValue("未分類");
});

test("既存の大項目グループに中項目を追加できる", async ({ page }) => {
  const categorySettings = page.getByTestId("category-settings");
  const group = categorySettings.locator("li").filter({ has: page.getByLabel("食費を開閉") });

  await group.getByLabel("食費に追加する中項目").fill("旅行");
  await group.getByRole("button", { name: "追加" }).click();

  await expect(categorySettings.getByLabel("食費/旅行の中項目")).toHaveValue("旅行");
});

test("中項目をインライン編集できる（他の行には影響しない）", async ({ page }) => {
  const categorySettings = page.getByTestId("category-settings");

  const subcategoryInput = categorySettings.getByLabel("食費/外食の中項目");
  await subcategoryInput.fill("ランチ");
  await subcategoryInput.blur();
  await expect(categorySettings.getByLabel("食費/ランチの中項目")).toHaveValue("ランチ");

  // 同じ大項目「食費」を持つ他の行（スーパーなど）は変更されない
  await expect(categorySettings.getByLabel("食費/スーパーの中項目")).toHaveValue("スーパー");
});

test("中項目の削除ボタンは1回目のクリックでは削除されず、確認後に削除される", async ({ page }) => {
  const categorySettings = page.getByTestId("category-settings");
  const row = categorySettings.getByLabel("食費/外食の中項目").locator("xpath=ancestor::li[1]");

  await row.getByRole("button", { name: "削除", exact: true }).click();
  await expect(categorySettings.getByLabel("食費/外食の中項目")).toBeVisible();

  await row.getByRole("button", { name: "本当に削除" }).click();
  await expect(categorySettings.getByLabel("食費/外食の中項目")).not.toBeVisible();
});

test("大項目の見出しから名前変更すると同じ大項目の全行が変わる", async ({ page }) => {
  const categorySettings = page.getByTestId("category-settings");
  const group = categorySettings.locator("li").filter({ has: page.getByLabel("食費を開閉") });

  await group.getByRole("button", { name: "名前変更" }).click();
  await categorySettings.getByLabel("食費の新しい大項目名").fill("食費(新)");
  await categorySettings.getByRole("button", { name: "保存" }).click();

  await expect(categorySettings.getByText("食費(新)")).toBeVisible();
  await expect(categorySettings.getByLabel("食費(新)/外食の中項目")).toHaveValue("外食");
  await expect(categorySettings.getByLabel("食費(新)/スーパーの中項目")).toHaveValue("スーパー");
});

test("大項目の見出しから削除は1回目のクリックでは削除されず、確認後に同じ大項目の全行が削除される", async ({ page }) => {
  const categorySettings = page.getByTestId("category-settings");
  const group = categorySettings.locator("li").filter({ has: page.getByLabel("食費を開閉") });

  await group.getByRole("button", { name: "大項目を削除" }).click();
  await expect(categorySettings.getByLabel("食費/外食の中項目")).toBeVisible();

  await group.getByRole("button", { name: "本当に削除" }).click();
  await expect(categorySettings.getByLabel("食費/外食の中項目")).not.toBeVisible();
  await expect(categorySettings.getByLabel("食費/スーパーの中項目")).not.toBeVisible();
});
