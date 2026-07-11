import { test, expect } from "@playwright/test";

test("設定画面からダッシュボードに戻れる", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "メニューを開く" }).click();
  await page.getByRole("button", { name: "設定" }).click();
  await expect(page.getByRole("heading", { name: "設定", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "ダッシュボードに戻る" }).click();
  await expect(page.getByText("合計支出: 150000")).toBeVisible();
});

test("初期状態はミント・クラリティテーマが適用される", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("html")).toHaveAttribute("data-theme", "mint-clarity");
});

test("ダークテーマを選択するとdata-theme属性が変わり、再読み込み後も保持される", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "メニューを開く" }).click();
  await page.getByRole("button", { name: "設定" }).click();
  await page.getByLabel("インディゴ・ミステリー").check();

  await expect(page.locator("html")).toHaveAttribute("data-theme", "indigo-mystery");

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "indigo-mystery");
});

test("6つのテーマバリエーションがライト/ダークにグループ分けされて表示される", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "メニューを開く" }).click();
  await page.getByRole("button", { name: "設定" }).click();

  const lightGroup = page.getByRole("radiogroup", { name: "ライトテーマ" });
  const darkGroup = page.getByRole("radiogroup", { name: "ダークテーマ" });

  await expect(lightGroup.getByLabel("ミント・クラリティ")).toBeVisible();
  await expect(lightGroup.getByLabel("クール・バイオレット")).toBeVisible();
  await expect(lightGroup.getByLabel("サニー・クォーツ")).toBeVisible();
  await expect(darkGroup.getByLabel("ディープ・アビス・グリーン")).toBeVisible();
  await expect(darkGroup.getByLabel("インディゴ・ミステリー")).toBeVisible();
  await expect(darkGroup.getByLabel("シャドウ・サン")).toBeVisible();
});
