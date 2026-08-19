// 全テーブルを空にする使い捨てユーティリティ。データ再投入前のやり直し用。
// 実行: DATABASE_URL="postgres://..." npx tsx db/tools/truncate-all.mts
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
  if (!databaseUrl) throw new Error("DATABASE_URLを指定してください");
  const sql = neon(databaseUrl);

  for (const table of TABLES) {
    await sql.query(`TRUNCATE TABLE ${table}`);
    console.log(`✓ truncated ${table}`);
  }
}

main().catch((e) => {
  console.error("失敗しました:", e);
  process.exit(1);
});
