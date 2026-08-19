// DBの中身を素早く確認するためのユーティリティスクリプト。
// スプレッドシートを目視で確認できなくなる代わりとして用意した
// （Issue #217「データ確認手段の代替」を参照）。
//
// 実行: DATABASE_URL="postgres://..." npx tsx db/tools/check-db.mts
import { neon } from "@neondatabase/serverless";

const TABLES = [
  "raw_data",
  "settings",
  "categories",
  "budgets",
  "ai_attributes",
  "ai_memory",
  "decisions",
  "goals",
  "ai_chat_session",
  "ai_log",
];

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URLを指定してください");
  }
  const sql = neon(databaseUrl);

  console.log("=== テーブルごとの件数 ===");
  for (const table of TABLES) {
    const rows = await sql.query(`SELECT COUNT(*) AS c FROM ${table}`);
    console.log(`${table}: ${rows[0].c}件`);
  }

  console.log("\n=== raw_data サンプル（日付昇順3件） ===");
  const sample = await sql`
    SELECT id, date, content, amount, category, subcategory, category_locked
    FROM raw_data ORDER BY date LIMIT 3
  `;
  console.log(JSON.stringify(sample, null, 2));

  console.log("\n=== raw_data の categoryLocked 集計 ===");
  const lockedCount = await sql`SELECT COUNT(*) AS c FROM raw_data WHERE category_locked = true`;
  console.log(`categoryLocked=true: ${lockedCount[0].c}件`);
}

main().catch((e) => {
  console.error("確認に失敗しました:", e);
  process.exit(1);
});
