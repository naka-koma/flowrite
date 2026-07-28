import { test, expect } from "@playwright/test";
import { openBudget } from "./helpers";

test("定期収入と定額の貯蓄目標を設定すると、使える総額が表示される", async ({ page }) => {
  await page.goto("/");
  await openBudget(page);

  const goalSettings = page.getByTestId("goal-settings");
  await expect(goalSettings.getByTestId("spendable-total")).not.toBeVisible();

  await goalSettings.getByLabel("定期収入（手取り月額）").fill("280000");
  await goalSettings.getByLabel("目標貯蓄額").fill("50000");
  await goalSettings.getByRole("button", { name: "保存" }).click();

  await expect(goalSettings.getByText("保存しました")).toBeVisible();
  await expect(goalSettings.getByTestId("spendable-total")).toHaveText("230,000円");
});

test("率で貯蓄目標を指定すると、金額に換算されて使える総額に反映される", async ({ page }) => {
  await page.goto("/");
  await openBudget(page);

  const goalSettings = page.getByTestId("goal-settings");
  await goalSettings.getByLabel("定期収入（手取り月額）").fill("300000");
  await goalSettings.getByRole("tab", { name: "率で指定" }).click();
  await goalSettings.getByLabel("目標貯蓄率").fill("20");
  await goalSettings.getByRole("button", { name: "保存" }).click();

  await expect(goalSettings.getByText("保存しました")).toBeVisible();
  // 300,000 × 20% = 60,000 が目標貯蓄額として換算される
  await expect(goalSettings.getByTestId("spendable-total")).toHaveText("240,000円");
});

test("予算の合計が使える総額を超えると超過額と警告が表示される", async ({ page }) => {
  await page.goto("/");
  await openBudget(page);

  const goalSettings = page.getByTestId("goal-settings");
  await goalSettings.getByLabel("定期収入（手取り月額）").fill("100000");
  await goalSettings.getByLabel("目標貯蓄額").fill("50000");
  await goalSettings.getByRole("button", { name: "保存" }).click();
  await expect(goalSettings.getByTestId("spendable-total")).toHaveText("50,000円");

  // 使える総額（50,000円）を超える予算を登録する
  await page.getByLabel("予算を設定する大項目").selectOption("食費");
  await page.getByLabel("新しい月間予算額").fill("80000");
  await page.getByRole("button", { name: "追加" }).click();

  await expect(goalSettings.getByTestId("budget-difference")).toContainText("超過");
  await expect(goalSettings.getByTestId("budget-difference")).toContainText("-30,000円");
  await expect(goalSettings.getByRole("alert")).toContainText("予算の見直しが必要です");
});

test("予算の合計が使える総額に収まっていれば残りが表示される", async ({ page }) => {
  await page.goto("/");
  await openBudget(page);

  const goalSettings = page.getByTestId("goal-settings");
  await goalSettings.getByLabel("定期収入（手取り月額）").fill("300000");
  await goalSettings.getByLabel("目標貯蓄額").fill("50000");
  await goalSettings.getByRole("button", { name: "保存" }).click();
  await expect(goalSettings.getByTestId("spendable-total")).toHaveText("250,000円");

  await page.getByLabel("予算を設定する大項目").selectOption("食費");
  await page.getByLabel("新しい月間予算額").fill("40000");
  await page.getByRole("button", { name: "追加" }).click();

  await expect(goalSettings.getByTestId("budget-difference")).toContainText("残り");
  await expect(goalSettings.getByTestId("budget-difference")).toContainText("210,000円");
});
