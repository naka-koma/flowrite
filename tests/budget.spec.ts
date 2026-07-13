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

  await expect(budgetSettings.getByLabel("食費の月間予算額")).toHaveValue("30000");
});

test("予算額をインライン編集で更新できる", async ({ page }) => {
  const budgetSettings = page.getByTestId("budget-settings");
  await budgetSettings.getByLabel("予算を設定する大項目").selectOption("食費");
  await budgetSettings.getByLabel("新しい月間予算額").fill("30000");
  await budgetSettings.getByRole("button", { name: "追加" }).click();
  await expect(budgetSettings.getByLabel("食費の月間予算額")).toHaveValue("30000");

  const amountInput = budgetSettings.getByLabel("食費の月間予算額");
  await amountInput.fill("35000");
  await amountInput.blur();

  await expect(budgetSettings.getByLabel("食費の月間予算額")).toHaveValue("35000");
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
