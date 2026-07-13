import { test, expect } from "@playwright/test";

test.describe("広い画面幅", () => {
  test("メニューが常時表示され、ハンバーガーボタンなしで画面遷移できる", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "flowrite" })).toBeVisible();

    await expect(page.getByRole("button", { name: "メニューを開く" })).not.toBeVisible();
    await expect(page.getByRole("button", { name: "設定" })).toBeVisible();

    await page.getByRole("button", { name: "設定" }).click();
    await expect(page.getByRole("heading", { name: "設定", exact: true })).toBeVisible();

    await page.getByRole("button", { name: "ホーム" }).click();
    await expect(page.getByRole("heading", { name: "設定", exact: true })).not.toBeVisible();
  });
});

test.describe("モバイル幅", () => {
  test.use({ viewport: { width: 375, height: 800 } });

  test("ハンバーガーメニューから設定画面とホームに遷移できる", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "メニューを開く" }).click();
    await page.getByRole("button", { name: "設定" }).click();
    await expect(page.getByRole("heading", { name: "設定", exact: true })).toBeVisible();

    await page.getByRole("button", { name: "メニューを開く" }).click();
    await page.getByRole("button", { name: "ホーム" }).click();
    await expect(page.getByRole("heading", { name: "設定", exact: true })).not.toBeVisible();
  });

  test("ハンバーガーメニューが透過されず不透明な背景で表示される", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "メニューを開く" }).click();

    const menu = page.getByRole("button", { name: "設定" }).locator("xpath=ancestor::ul");
    const backdropFilter = await menu.evaluate((el) => getComputedStyle(el).backdropFilter);
    const backgroundColor = await menu.evaluate((el) => getComputedStyle(el).backgroundColor);

    expect(backdropFilter).toBe("none");
    // 不透明なrgb()形式であること（rgba(...,アルファ<1)ではないこと）を確認する
    expect(backgroundColor.startsWith("rgb(")).toBe(true);
  });

  test("メニュー外をクリックするとメニューが閉じる", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "メニューを開く" }).click();
    await expect(page.getByRole("button", { name: "設定" })).toBeVisible();

    // オーバーレイの中心座標はサイドバー（幅256px）の開閉アニメーション中に重なることがあるため、
    // サイドバーの外側であることが確実な座標をクリックする
    await page.getByLabel("メニューを閉じる").click({ force: true, position: { x: 350, y: 10 } });
    await expect(page.getByRole("button", { name: "設定" })).not.toBeVisible();
  });
});
