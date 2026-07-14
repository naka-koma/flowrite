import { test, expect } from "@playwright/test";
import { openBudget } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await openBudget(page);
});

test("予算が未登録の場合は案内メッセージが表示される", async ({ page }) => {
  await expect(page.getByText("登録されている予算はありません")).toBeVisible();
});

test("大項目を選んで予算を追加できる", async ({ page }) => {
  const budgetSettings = page.getByTestId("budget-settings");
  await budgetSettings.getByLabel("予算を設定する大項目").selectOption("食費");
  await budgetSettings.getByLabel("新しい月間予算額").fill("30000");
  await budgetSettings.getByRole("button", { name: "追加" }).click();

  await expect(budgetSettings.getByLabel("食費の月間予算額")).toHaveValue("30,000");
});

test("推奨カテゴリーを選んで予算を追加できる（categoriesに未登録でも追加できる）", async ({ page }) => {
  const budgetSettings = page.getByTestId("budget-settings");
  await budgetSettings.getByLabel("予算を設定する大項目").selectOption({ label: "住居（推奨）" });
  await budgetSettings.getByLabel("新しい月間予算額").fill("80000");
  await budgetSettings.getByRole("button", { name: "追加" }).click();

  await expect(budgetSettings.getByLabel("住居の月間予算額")).toHaveValue("80,000");
});

test("「新規入力」でcategoriesに存在しない大項目名でも予算を追加できる", async ({ page }) => {
  const budgetSettings = page.getByTestId("budget-settings");
  await budgetSettings.getByLabel("予算を設定する大項目").selectOption("新規入力");
  await budgetSettings.getByLabel("新しい大項目名").fill("特別費");
  await budgetSettings.getByLabel("新しい月間予算額").fill("10000");
  await budgetSettings.getByRole("button", { name: "追加" }).click();

  await expect(budgetSettings.getByLabel("特別費の月間予算額")).toHaveValue("10,000");
});

test("予算額をインライン編集で更新できる（カンマ区切りで表示される）", async ({ page }) => {
  const budgetSettings = page.getByTestId("budget-settings");
  await budgetSettings.getByLabel("予算を設定する大項目").selectOption("食費");
  await budgetSettings.getByLabel("新しい月間予算額").fill("30000");
  await budgetSettings.getByRole("button", { name: "追加" }).click();
  await expect(budgetSettings.getByLabel("食費の月間予算額")).toHaveValue("30,000");

  const amountInput = budgetSettings.getByLabel("食費の月間予算額");
  await amountInput.fill("35000");
  await amountInput.blur();

  await expect(budgetSettings.getByLabel("食費の月間予算額")).toHaveValue("35,000");
});

test("合計金額が表示され、予算を追加・編集すると更新される", async ({ page }) => {
  const budgetSettings = page.getByTestId("budget-settings");
  await budgetSettings.getByLabel("予算を設定する大項目").selectOption("食費");
  await budgetSettings.getByLabel("新しい月間予算額").fill("30000");
  await budgetSettings.getByRole("button", { name: "追加" }).click();
  await expect(budgetSettings.getByText("合計: 30,000円")).toBeVisible();

  await budgetSettings.getByLabel("予算を設定する大項目").selectOption({ label: "住居（推奨）" });
  await budgetSettings.getByLabel("新しい月間予算額").fill("80000");
  await budgetSettings.getByRole("button", { name: "追加" }).click();
  await expect(budgetSettings.getByText("合計: 110,000円")).toBeVisible();
});

test("削除ボタンは1回目のクリックでは削除されず、確認後に削除される", async ({ page }) => {
  const budgetSettings = page.getByTestId("budget-settings");
  await budgetSettings.getByLabel("予算を設定する大項目").selectOption("食費");
  await budgetSettings.getByLabel("新しい月間予算額").fill("30000");
  await budgetSettings.getByRole("button", { name: "追加" }).click();
  await expect(budgetSettings.getByLabel("食費の月間予算額")).toBeVisible();

  await budgetSettings.getByRole("button", { name: "削除" }).click();
  await expect(budgetSettings.getByLabel("食費の月間予算額")).toBeVisible();

  await budgetSettings.getByRole("button", { name: "本当に削除" }).click();
  await expect(budgetSettings.getByLabel("食費の月間予算額")).not.toBeVisible();
  await expect(page.getByText("登録されている予算はありません")).toBeVisible();
});
