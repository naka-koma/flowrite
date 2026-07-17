import type { Locator, Page } from "@playwright/test";

// ホーム画面の「期間」カード（AIアドバイス内の独立ピッカーと同じラベルを使うため、
// タブ・セレクタの問い合わせはこのスコープ内で行う）
export function periodSelector(page: Page): Locator {
  return page.getByTestId("period-selector");
}

// ホーム画面の「期間」カードの単位（月/年/週）を切り替える
export async function selectPeriodUnit(page: Page, unit: "month" | "year" | "week"): Promise<void> {
  await periodSelector(page).getByLabel("期間の単位").selectOption(unit);
}

// 広い画面幅ではサイドバーが常時表示され、ハンバーガーボタンは表示されない。
// 画面幅に関わらず設定画面へ遷移できるようにする
export async function openSettings(page: Page): Promise<void> {
  const menuButton = page.getByRole("button", { name: "メニューを開く" });
  if (await menuButton.isVisible()) {
    await menuButton.click();
  }
  await page.getByRole("button", { name: "設定", exact: true }).click();
}

// 広い画面幅ではサイドバーが常時表示され、ハンバーガーボタンは表示されない。
// 画面幅に関わらずレポート画面へ遷移できるようにする
export async function openReport(page: Page): Promise<void> {
  const menuButton = page.getByRole("button", { name: "メニューを開く" });
  if (await menuButton.isVisible()) {
    await menuButton.click();
  }
  await page.getByRole("button", { name: "レポート", exact: true }).click();
}

// 広い画面幅ではサイドバーが常時表示され、ハンバーガーボタンは表示されない。
// 画面幅に関わらず取引一覧画面へ遷移できるようにする
export async function openTransactionList(page: Page): Promise<void> {
  const menuButton = page.getByRole("button", { name: "メニューを開く" });
  if (await menuButton.isVisible()) {
    await menuButton.click();
  }
  await page.getByRole("button", { name: "取引一覧", exact: true }).click();
}

// 広い画面幅ではサイドバーが常時表示され、ハンバーガーボタンは表示されない。
// 画面幅に関わらず予算画面へ遷移できるようにする
export async function openBudget(page: Page): Promise<void> {
  const menuButton = page.getByRole("button", { name: "メニューを開く" });
  if (await menuButton.isVisible()) {
    await menuButton.click();
  }
  await page.getByRole("button", { name: "予算", exact: true }).click();
}

// 広い画面幅ではサイドバーが常時表示され、ハンバーガーボタンは表示されない。
// 画面幅に関わらずAI画面へ遷移できるようにする
export async function openAiScreen(page: Page): Promise<void> {
  const menuButton = page.getByRole("button", { name: "メニューを開く" });
  if (await menuButton.isVisible()) {
    await menuButton.click();
  }
  await page.getByRole("button", { name: "AI", exact: true }).click();
}

