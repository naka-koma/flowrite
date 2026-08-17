// fixtures/sample-export.json（date表記ゆれ・categoryLockedの型ゆれ等のエッジケースを含む）を
// 変換・投入し、想定通りの値になっているかをPGlite上で検証する。
// 実行: npx tsx db/migrate-from-sheets/verify.mts
import { readFileSync } from "node:fs";
import { eq } from "drizzle-orm";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "../schema.ts";
import { transformExport } from "./transform.mjs";
import { loadIntoDb } from "./load.mts";

function assertEqual(actual: unknown, expected: unknown, label: string) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    throw new Error(`${label}: expected ${e}, got ${a}`);
  }
  console.log(`✓ ${label}`);
}

async function main() {
  const exportData = JSON.parse(
    readFileSync(new URL("./fixtures/sample-export.json", import.meta.url), "utf-8"),
  );
  const transformed = transformExport(exportData);

  // --- 変換結果そのものの検証（日付表記ゆれ・categoryLockedの型ゆれ） ---
  assertEqual(transformed.rawData[0]?.date, "2026-06-03", "date: スラッシュ区切り(2026/06/03)がISO形式に変換される");
  assertEqual(transformed.rawData[2]?.date, "2026-06-15", "date: 既にISO形式の場合はそのまま");
  assertEqual(transformed.rawData[0]?.categoryLocked, true, "categoryLocked: 真偽値trueはそのまま");
  assertEqual(transformed.rawData[1]?.categoryLocked, false, "categoryLocked: 文字列\"FALSE\"はfalseに変換される");
  assertEqual(transformed.rawData[2]?.categoryLocked, false, "categoryLocked: 空文字はfalseに変換される");
  assertEqual(transformed.rawData[2]?.isTransfer, true, "isTransfer: 数値1はtrueに変換される");
  assertEqual(transformed.rawData[0]?.isTransfer, false, "isTransfer: 数値0はfalseに変換される");
  assertEqual(
    transformed.aiChatSession[0]?.quickReplies,
    ["外食が増えたかも"],
    "aiChatSession: JSON文字列カラムがパースされる",
  );

  // --- DBへ投入して読み戻し、型が正しく保存されるかを検証する ---
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "./db/migrations" });
  await loadIntoDb(db, transformed);

  const rows = await db.select().from(schema.rawData).orderBy(schema.rawData.id);
  assertEqual(rows.length, 3, "raw_data: 3件投入される");
  assertEqual(rows[2]?.isTransfer, true, "raw_data: 振替行がDB上でもtrueとして読み戻せる");

  const lockedOnly = await db.select().from(schema.rawData).where(eq(schema.rawData.categoryLocked, true));
  assertEqual(lockedOnly.length, 1, "raw_data: categoryLocked=trueの行が1件のみ（#212のMF書き戻しロジック相当）");

  const decisionRows = await db.select().from(schema.decisions);
  assertEqual(decisionRows[0]?.beforeAmount, 25000, "decisions: beforeAmountが数値として保存される");

  console.log("\nすべての検証に成功しました");
  await client.close();
}

main().catch((e) => {
  console.error("検証失敗:", e);
  process.exit(1);
});
