// PGlite（WASM版Postgres）にマイグレーションを適用し、代表的なクエリが動くことを確認する
// ローカル検証スクリプト（Neon等の実DBへの接続は不要）。
// 実行: npx tsx db/verify-local.mts
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { sql } from "drizzle-orm";
import * as schema from "./schema.ts";

async function main() {
  const client = new PGlite();
  const db = drizzle(client, { schema });

  await migrate(db, { migrationsFolder: "./db/migrations" });
  console.log("✓ migrations applied");

  // raw_dataへの投入（型がPostgresネイティブ型として正しく扱われることを確認する）
  await db.insert(schema.rawData).values([
    {
      id: "mf-1",
      date: "2026-06-03",
      content: "スーパー",
      amount: -3000,
      institution: "楽天カード",
      category: "食費",
      subcategory: "スーパー",
      isTransfer: false,
      isTarget: true,
      importedAt: new Date("2026-06-03T00:00:00Z"),
      updatedAt: new Date("2026-06-03T00:00:00Z"),
      categoryLocked: true,
    },
    {
      id: "mf-2",
      date: "2026-06-10",
      content: "給与振込",
      amount: 300000,
      institution: "住信SBIネット銀行",
      category: "給与",
      subcategory: "給与",
      isTransfer: false,
      isTarget: true,
      importedAt: new Date("2026-06-10T00:00:00Z"),
      updatedAt: new Date("2026-06-10T00:00:00Z"),
    },
    {
      id: "mf-3",
      date: "2026-06-15",
      content: "口座振替",
      amount: -50000,
      institution: "楽天カード",
      category: "",
      subcategory: "",
      isTransfer: true, // 振替は集計対象外
      isTarget: true,
      importedAt: new Date("2026-06-15T00:00:00Z"),
      updatedAt: new Date("2026-06-15T00:00:00Z"),
    },
  ]);
  console.log("✓ raw_data insert ok");

  // handleSummary相当: カテゴリ別支出内訳（振替除外）
  const categoryBreakdown = await db.execute(sql`
    SELECT category, SUM(-amount) AS total
    FROM raw_data
    WHERE is_target = true AND is_transfer = false AND amount < 0
      AND date >= '2026-06-01' AND date < '2026-07-01'
    GROUP BY category
  `);
  console.log("category breakdown:", categoryBreakdown.rows);
  if (categoryBreakdown.rows.length !== 1 || Number(categoryBreakdown.rows[0]?.total) !== 3000) {
    throw new Error(`unexpected category breakdown: ${JSON.stringify(categoryBreakdown.rows)}`);
  }

  // categoryLocked=trueの行のみ抽出（MF書き戻し差分相当。#212のロジックが正しく表現できるか）
  const lockedRows = await db.select().from(schema.rawData).where(sql`category_locked = true`);
  console.log("locked rows:", lockedRows.length);
  if (lockedRows.length !== 1 || lockedRows[0]?.id !== "mf-1") {
    throw new Error(`unexpected locked rows: ${JSON.stringify(lockedRows)}`);
  }

  // ai_chat_session: jsonb型の読み書き確認
  await db.insert(schema.aiChatSession).values({
    messages: [{ role: "user", text: "hello" }],
    history: [],
    quickReplies: ["外食が増えたかも"],
    todoActions: [],
    categorySuggestions: [],
  });
  const session = await db.select().from(schema.aiChatSession);
  console.log("ai_chat_session:", session);
  if (!Array.isArray(session[0]?.quickReplies) || session[0].quickReplies[0] !== "外食が増えたかも") {
    throw new Error(`unexpected ai_chat_session row: ${JSON.stringify(session)}`);
  }

  // categories: 複合主キー（category, subcategory）の重複投入がエラーになることを確認する
  await db.insert(schema.categories).values({ category: "食費", subcategory: "スーパー" });
  let duplicateRejected = false;
  try {
    await db.insert(schema.categories).values({ category: "食費", subcategory: "スーパー" });
  } catch {
    duplicateRejected = true;
  }
  if (!duplicateRejected) {
    throw new Error("expected duplicate (category, subcategory) insert to fail");
  }
  console.log("✓ categories composite primary key enforced");

  console.log("\nすべての検証に成功しました");
  await client.close();
}

main().catch((e) => {
  console.error("検証失敗:", e);
  process.exit(1);
});
