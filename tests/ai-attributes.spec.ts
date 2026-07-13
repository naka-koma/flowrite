import { test, expect } from "@playwright/test";
import { openSettings } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await openSettings(page);
});

test("属性情報が未登録の場合は案内メッセージが表示される", async ({ page }) => {
  await expect(page.getByText("登録されている属性情報はありません")).toBeVisible();
});

test("属性情報を追加できる", async ({ page }) => {
  const aiAttributes = page.getByTestId("ai-attributes-settings");
  await aiAttributes.getByLabel("新しい項目名").fill("ワークスタイル");
  await aiAttributes.getByLabel("新しい内容").fill("在宅リモートワーク中心");
  await aiAttributes.getByRole("button", { name: "追加" }).click();

  await expect(page.getByText("ワークスタイル")).toBeVisible();
  await expect(page.getByText("在宅リモートワーク中心")).toBeVisible();
});

test("同じ項目名で追加すると内容が上書きされる", async ({ page }) => {
  const aiAttributes = page.getByTestId("ai-attributes-settings");

  await aiAttributes.getByLabel("新しい項目名").fill("直近の目標");
  await aiAttributes.getByLabel("新しい内容").fill("貯金を増やす");
  await aiAttributes.getByRole("button", { name: "追加" }).click();
  await expect(page.getByText("貯金を増やす")).toBeVisible();

  await aiAttributes.getByLabel("新しい項目名").fill("直近の目標");
  await aiAttributes.getByLabel("新しい内容").fill("投資の種銭を月5万作りたい");
  await aiAttributes.getByRole("button", { name: "追加" }).click();

  await expect(page.getByText("投資の種銭を月5万作りたい")).toBeVisible();
  await expect(page.getByText("貯金を増やす")).not.toBeVisible();
});

test("属性情報を削除できる", async ({ page }) => {
  const aiAttributes = page.getByTestId("ai-attributes-settings");
  await aiAttributes.getByLabel("新しい項目名").fill("ワークスタイル");
  await aiAttributes.getByLabel("新しい内容").fill("在宅リモートワーク中心");
  await aiAttributes.getByRole("button", { name: "追加" }).click();
  await expect(page.getByText("ワークスタイル")).toBeVisible();

  await aiAttributes.getByRole("button", { name: "削除" }).click();

  await expect(page.getByText("ワークスタイル")).not.toBeVisible();
  await expect(page.getByText("登録されている属性情報はありません")).toBeVisible();
});

test("追加した属性情報は再読み込み後も保持される", async ({ page }) => {
  const aiAttributes = page.getByTestId("ai-attributes-settings");
  await aiAttributes.getByLabel("新しい項目名").fill("ワークスタイル");
  await aiAttributes.getByLabel("新しい内容").fill("在宅リモートワーク中心");
  await aiAttributes.getByRole("button", { name: "追加" }).click();
  await expect(page.getByText("ワークスタイル")).toBeVisible();

  await page.reload();
  await openSettings(page);

  await expect(page.getByText("ワークスタイル")).toBeVisible();
  await expect(page.getByText("在宅リモートワーク中心")).toBeVisible();
});
