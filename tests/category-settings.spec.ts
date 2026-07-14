import { test, expect } from "@playwright/test";
import { openSettings } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await openSettings(page);
});

test("設定画面にカテゴリのペア一覧が表示される", async ({ page }) => {
  const categorySettings = page.getByTestId("category-settings");
  await expect(categorySettings.getByLabel("食費/外食の大項目")).toHaveValue("食費");
  await expect(categorySettings.getByLabel("食費/外食の中項目")).toHaveValue("外食");
});

test("新しいペアを追加できる", async ({ page }) => {
  const categorySettings = page.getByTestId("category-settings");
  await categorySettings.getByLabel("新しい大項目").fill("特別費");
  await categorySettings.getByLabel("新しい中項目").fill("旅行");
  await categorySettings.getByRole("button", { name: "追加" }).click();

  await expect(categorySettings.getByLabel("特別費/旅行の大項目")).toHaveValue("特別費");
  await expect(categorySettings.getByLabel("特別費/旅行の中項目")).toHaveValue("旅行");
});

test("ペア単位で大項目・中項目をインライン編集できる（他の行には影響しない）", async ({ page }) => {
  const categorySettings = page.getByTestId("category-settings");

  const categoryInput = categorySettings.getByLabel("食費/外食の大項目");
  await categoryInput.fill("食費(新)");
  await categoryInput.blur();
  await expect(categorySettings.getByLabel("食費(新)/外食の大項目")).toHaveValue("食費(新)");

  // 同じ大項目「食費」を持つ他の行（スーパーなど）は変更されない
  await expect(categorySettings.getByLabel("食費/スーパーの大項目")).toHaveValue("食費");

  const subcategoryInput = categorySettings.getByLabel("食費(新)/外食の中項目");
  await subcategoryInput.fill("ランチ");
  await subcategoryInput.blur();
  await expect(categorySettings.getByLabel("食費(新)/ランチの中項目")).toHaveValue("ランチ");
});

test("ペアの削除ボタンは1回目のクリックでは削除されず、確認後に削除される", async ({ page }) => {
  const categorySettings = page.getByTestId("category-settings");
  const row = categorySettings.locator("li").filter({ has: page.getByLabel("食費/外食の大項目") });

  await row.getByRole("button", { name: "削除" }).click();
  await expect(categorySettings.getByLabel("食費/外食の大項目")).toBeVisible();

  await row.getByRole("button", { name: "本当に削除" }).click();
  await expect(categorySettings.getByLabel("食費/外食の大項目")).not.toBeVisible();
});

test("大項目の一括変更セクションでリネームすると同じ大項目の全行が変わる", async ({ page }) => {
  const categorySettings = page.getByTestId("category-settings");
  await categorySettings.getByLabel("一括変更する大項目").selectOption("食費");
  await categorySettings.getByLabel("一括変更後の大項目名").fill("食費(一括)");
  await categorySettings.getByRole("button", { name: "一括リネーム" }).click();

  await expect(categorySettings.getByLabel("食費(一括)/外食の大項目")).toHaveValue("食費(一括)");
  await expect(categorySettings.getByLabel("食費(一括)/スーパーの大項目")).toHaveValue("食費(一括)");
  await expect(categorySettings.getByLabel("食費(一括)/コンビニの大項目")).toHaveValue("食費(一括)");
});

test("大項目の一括削除は1回目のクリックでは削除されず、確認後に同じ大項目の全行が削除される", async ({ page }) => {
  const categorySettings = page.getByTestId("category-settings");
  await categorySettings.getByLabel("一括変更する大項目").selectOption("食費");

  await categorySettings.getByRole("button", { name: "大項目を一括削除" }).click();
  await expect(categorySettings.getByLabel("食費/外食の大項目")).toBeVisible();

  await categorySettings.getByRole("button", { name: "本当に削除" }).click();
  await expect(categorySettings.getByLabel("食費/外食の大項目")).not.toBeVisible();
  await expect(categorySettings.getByLabel("食費/スーパーの大項目")).not.toBeVisible();
});
