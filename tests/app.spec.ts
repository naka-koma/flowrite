import { test, expect } from "@playwright/test";

test("ページが正しく表示される", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "flowrite" })).toBeVisible();
});

test("スマホ幅でも横スクロールが発生しない", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "flowrite" })).toBeVisible();
  await expect(page.locator(".recharts-pie")).toBeVisible();

  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
});

test("各セクションの見出しとBodyの間に区切り線が入り、スタイルが統一されている", async ({ page }) => {
  await page.goto("/");

  const sectionHeadings = ["CSVアップロード", "サマリー", "トレンド", "AIアドバイス"];

  for (const name of sectionHeadings) {
    const heading = page.getByRole("heading", { name, exact: true });
    await expect(heading).toBeVisible();

    const borderBottomWidth = await heading.evaluate((el) => getComputedStyle(el).borderBottomWidth);
    expect(borderBottomWidth).not.toBe("0px");
  }
});
