import { test, expect } from "@playwright/test";
import { openBudget } from "./helpers";

test("変更履歴は最初は空で、予算を設定すると記録される", async ({ page }) => {
  await page.goto("/");
  await openBudget(page);

  await expect(page.getByText("まだ変更履歴はありません")).toBeVisible();

  await page.getByLabel("予算を設定する大項目").selectOption("食費");
  await page.getByLabel("新しい月間予算額").fill("40000");
  await page.getByRole("button", { name: "追加" }).click();

  const history = page.getByTestId("decision-history");
  await expect(history.getByRole("listitem")).toHaveCount(1);
  // 新規設定時は変更前が存在しない
  await expect(history.getByRole("listitem").first()).toContainText("食費");
  await expect(history.getByRole("listitem").first()).toContainText("新規 → 40,000円");
});

test("同じ値で保存し直しても履歴は増えない", async ({ page }) => {
  await page.goto("/");
  await openBudget(page);

  const goalSettings = page.getByTestId("goal-settings");
  await goalSettings.getByLabel("定期収入（手取り月額）").fill("300000");
  await goalSettings.getByLabel("目標貯蓄額").fill("50000");
  await goalSettings.getByRole("button", { name: "保存" }).click();
  await expect(goalSettings.getByText("保存しました")).toBeVisible();

  await expect(page.getByTestId("decision-history").getByRole("listitem")).toHaveCount(1);

  // 値を変えずに保存し直す
  await goalSettings.getByRole("button", { name: "保存" }).click();
  await page.reload();
  await openBudget(page);

  await expect(page.getByTestId("decision-history").getByRole("listitem")).toHaveCount(1);
});

test("AIの見直し案を適用すると、理由付きでAI提案として記録される", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "今月のざっくり振り返り" }).click();
  await page.getByRole("button", { name: "外食が増えたかも" }).click();
  await page.getByRole("button", { name: "来月は減らしたい" }).click();

  // 見直し案は項目ごとに個別適用するため、3件とも順番に適用する
  const advice = page.getByTestId("ai-advice");
  for (const label of ["食費", "目標貯蓄額", "特別費積立"]) {
    const item = advice.getByRole("listitem").filter({ hasText: label });
    await item.getByRole("button", { name: "適用する" }).click();
    await expect(item.getByText("適用済み")).toBeVisible();
  }

  await openBudget(page);
  const history = page.getByTestId("decision-history");

  // 予算・貯蓄目標・特別費積立の3件がそれぞれ理由付きで残る
  await expect(history.getByRole("listitem")).toHaveCount(3);
  await expect(history.getByText("外食の頻度を月2回に抑えるため")).toBeVisible();
  await expect(history.getByText("支出削減分をそのまま貯蓄に回すため")).toBeVisible();
  await expect(history.getByText("年末の帰省費を月割りで備えるため")).toBeVisible();
  await expect(history.getByText("AI提案").first()).toBeVisible();
});

test("手動での変更にはAI提案のラベルが付かない", async ({ page }) => {
  await page.goto("/");
  await openBudget(page);

  await page.getByLabel("予算を設定する大項目").selectOption("食費");
  await page.getByLabel("新しい月間予算額").fill("40000");
  await page.getByRole("button", { name: "追加" }).click();

  const history = page.getByTestId("decision-history");
  await expect(history.getByRole("listitem")).toHaveCount(1);
  await expect(history.getByText("AI提案")).not.toBeVisible();
});
