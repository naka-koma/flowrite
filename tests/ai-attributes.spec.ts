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

  await expect(aiAttributes.getByLabel("ワークスタイルの項目名")).toHaveValue("ワークスタイル");
  await expect(aiAttributes.getByLabel("ワークスタイルの内容")).toHaveValue("在宅リモートワーク中心");
});

test("同じ項目名で追加すると別の行として追加される", async ({ page }) => {
  const aiAttributes = page.getByTestId("ai-attributes-settings");

  await aiAttributes.getByLabel("新しい項目名").fill("目標");
  await aiAttributes.getByLabel("新しい内容").fill("貯金を増やす");
  await aiAttributes.getByRole("button", { name: "追加" }).click();
  await expect(aiAttributes.getByLabel("目標の内容")).toHaveValue("貯金を増やす");

  await aiAttributes.getByLabel("新しい項目名").fill("目標");
  await aiAttributes.getByLabel("新しい内容").fill("投資の種銭を月5万作りたい");
  await aiAttributes.getByRole("button", { name: "追加" }).click();

  await expect(aiAttributes.getByLabel("目標の項目名")).toHaveCount(2);
});

test("項目名・内容をインライン編集で更新できる", async ({ page }) => {
  const aiAttributes = page.getByTestId("ai-attributes-settings");
  await aiAttributes.getByLabel("新しい項目名").fill("ワークスタイル");
  await aiAttributes.getByLabel("新しい内容").fill("在宅リモートワーク中心");
  await aiAttributes.getByRole("button", { name: "追加" }).click();
  await expect(aiAttributes.getByLabel("ワークスタイルの内容")).toHaveValue("在宅リモートワーク中心");

  const valueInput = aiAttributes.getByLabel("ワークスタイルの内容");
  await valueInput.fill("フルリモート");
  await valueInput.blur();

  await expect(aiAttributes.getByLabel("ワークスタイルの内容")).toHaveValue("フルリモート");
});

test("削除ボタンは1回目のクリックでは削除されず、確認後に削除される", async ({ page }) => {
  const aiAttributes = page.getByTestId("ai-attributes-settings");
  await aiAttributes.getByLabel("新しい項目名").fill("ワークスタイル");
  await aiAttributes.getByLabel("新しい内容").fill("在宅リモートワーク中心");
  await aiAttributes.getByRole("button", { name: "追加" }).click();
  await expect(aiAttributes.getByLabel("ワークスタイルの項目名")).toBeVisible();

  await aiAttributes.getByRole("button", { name: "削除" }).click();
  await expect(aiAttributes.getByLabel("ワークスタイルの項目名")).toBeVisible();

  await aiAttributes.getByRole("button", { name: "本当に削除" }).click();

  await expect(aiAttributes.getByLabel("ワークスタイルの項目名")).not.toBeVisible();
  await expect(page.getByText("登録されている属性情報はありません")).toBeVisible();
});

test("削除確認はキャンセルできる", async ({ page }) => {
  const aiAttributes = page.getByTestId("ai-attributes-settings");
  await aiAttributes.getByLabel("新しい項目名").fill("ワークスタイル");
  await aiAttributes.getByLabel("新しい内容").fill("在宅リモートワーク中心");
  await aiAttributes.getByRole("button", { name: "追加" }).click();

  await aiAttributes.getByRole("button", { name: "削除" }).click();
  await aiAttributes.getByRole("button", { name: "キャンセル" }).click();

  await expect(aiAttributes.getByLabel("ワークスタイルの項目名")).toBeVisible();
});

test("追加した属性情報は再読み込み後も保持される", async ({ page }) => {
  const aiAttributes = page.getByTestId("ai-attributes-settings");
  await aiAttributes.getByLabel("新しい項目名").fill("ワークスタイル");
  await aiAttributes.getByLabel("新しい内容").fill("在宅リモートワーク中心");
  await aiAttributes.getByRole("button", { name: "追加" }).click();
  await expect(aiAttributes.getByLabel("ワークスタイルの項目名")).toBeVisible();

  await page.reload();
  await openSettings(page);

  await expect(page.getByTestId("ai-attributes-settings").getByLabel("ワークスタイルの項目名")).toHaveValue(
    "ワークスタイル",
  );
  await expect(page.getByTestId("ai-attributes-settings").getByLabel("ワークスタイルの内容")).toHaveValue(
    "在宅リモートワーク中心",
  );
});
