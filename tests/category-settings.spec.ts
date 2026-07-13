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
