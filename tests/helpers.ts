import type { Page } from "@playwright/test";

// 広い画面幅ではサイドバーが常時表示され、ハンバーガーボタンは表示されない。
// 画面幅に関わらず設定画面へ遷移できるようにする
export async function openSettings(page: Page): Promise<void> {
  const menuButton = page.getByRole("button", { name: "メニューを開く" });
  if (await menuButton.isVisible()) {
    await menuButton.click();
  }
  await page.getByRole("button", { name: "設定" }).click();
}

// 広い画面幅ではサイドバーが常時表示され、ハンバーガーボタンは表示されない。
// 画面幅に関わらずレポート画面へ遷移できるようにする
export async function openReport(page: Page): Promise<void> {
  const menuButton = page.getByRole("button", { name: "メニューを開く" });
  if (await menuButton.isVisible()) {
    await menuButton.click();
  }
  await page.getByRole("button", { name: "レポート" }).click();
}
