import { test, expect } from "@playwright/test";
import { openMfSync } from "./helpers";

test("前回の記録以降にカテゴリ変更された取引が一覧表示される", async ({ page }) => {
  await page.goto("/");
  await openMfSync(page);

  const panel = page.getByTestId("mf-sync-diff");
  await expect(panel.getByText("対象: 3件")).toBeVisible();
  await expect(panel.getByRole("cell", { name: "スーパー" })).toBeVisible();
  await expect(panel.getByRole("cell", { name: "カフェ" })).toBeVisible();
  await expect(panel.getByRole("cell", { name: "書店" })).toBeVisible();
  await expect(panel.getByText("前回の記録: 未記録")).toBeVisible();
});

test("変更対象がない場合は「変更はありません」と表示される", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __MOCK_SCENARIO__: Record<string, boolean> }).__MOCK_SCENARIO__ = {
      mfSyncEmpty: true,
    };
  });
  await page.goto("/");
  await openMfSync(page);

  const panel = page.getByTestId("mf-sync-diff");
  await expect(panel.getByText("対象: 0件")).toBeVisible();
  await expect(panel.getByText("書き戻し対象の変更はありません")).toBeVisible();
});

test("書き戻し完了として記録すると、以後の差分が0件になる", async ({ page }) => {
  await page.goto("/");
  await openMfSync(page);

  const panel = page.getByTestId("mf-sync-diff");
  await expect(panel.getByText("対象: 3件")).toBeVisible();

  await panel.getByRole("button", { name: "書き戻し完了として記録する" }).click();
  await panel.getByRole("button", { name: "本当に記録する" }).click();

  await expect(panel.getByText("記録しました")).toBeVisible();
  await expect(panel.getByText("対象: 0件")).toBeVisible();
  await expect(panel.getByText("書き戻し対象の変更はありません")).toBeVisible();
});

test("記録の確認をキャンセルすると記録されない", async ({ page }) => {
  await page.goto("/");
  await openMfSync(page);

  const panel = page.getByTestId("mf-sync-diff");
  await expect(panel.getByText("対象: 3件")).toBeVisible();

  await panel.getByRole("button", { name: "書き戻し完了として記録する" }).click();
  await panel.getByRole("button", { name: "キャンセル" }).click();

  await expect(panel.getByText("対象: 3件")).toBeVisible();
});

test("CSVダウンロードボタンでCSVファイルがダウンロードされる", async ({ page }) => {
  await page.goto("/");
  await openMfSync(page);

  const panel = page.getByTestId("mf-sync-diff");
  await expect(panel.getByText("対象: 3件")).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await panel.getByRole("button", { name: "CSVをダウンロード" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^mf-sync-diff_\d{8}\.csv$/);
});
