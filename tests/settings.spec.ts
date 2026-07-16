import { test, expect } from "@playwright/test";
import { openSettings } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await openSettings(page);
});

test("バージョン情報が表示される", async ({ page }) => {
  await expect(page.getByText("v-dev (mock)")).toBeVisible();
});

test("トレンドチャートの表示件数を変更して再読み込み後も反映される", async ({ page }) => {
  await expect(page.getByLabel("トレンドチャートの表示件数")).toHaveValue("12");

  await page.getByLabel("トレンドチャートの表示件数").fill("20");
  await page.getByRole("button", { name: "ホーム" }).click();

  await openSettings(page);
  await expect(page.getByLabel("トレンドチャートの表示件数")).toHaveValue("20");

  await page.reload();
  await openSettings(page);
  await expect(page.getByLabel("トレンドチャートの表示件数")).toHaveValue("20");
});
