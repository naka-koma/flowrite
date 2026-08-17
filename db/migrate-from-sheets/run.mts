// エクスポートJSON（gas/migrationExport.js の出力）を読み込み、変換して新DBへ投入する。
//
// 使い方:
//   npx tsx db/migrate-from-sheets/run.mts --input path/to/export.json
//     DATABASE_URLを指定しない場合、PGlite（ローカル・使い捨て）に投入して動作確認のみ行う。
//
//   DATABASE_URL="postgres://..." npx tsx db/migrate-from-sheets/run.mts --input path/to/export.json
//     指定した接続先（Neon等）へ実際に投入する。Phase 3の本番移行時に使用する。
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "../schema.ts";
import { transformExport } from "./transform.mjs";
import { loadIntoDb } from "./load.mts";

function parseArgs(argv: string[]): { input: string } {
  const inputIndex = argv.indexOf("--input");
  if (inputIndex === -1 || !argv[inputIndex + 1]) {
    throw new Error("--input <エクスポートJSONへのパス> を指定してください");
  }
  return { input: argv[inputIndex + 1]! };
}

async function main() {
  const { input } = parseArgs(process.argv.slice(2));
  const exportData = JSON.parse(readFileSync(input, "utf-8"));

  console.log("変換中...");
  const transformed = transformExport(exportData);
  for (const [key, rows] of Object.entries(transformed)) {
    console.log(`  ${key}: ${(rows as unknown[]).length}件`);
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    console.log("\n接続先DBへ投入します（DATABASE_URL指定あり）");
    const sql = neon(databaseUrl);
    const db = drizzleNeon(sql, { schema });
    const counts = await loadIntoDb(db, transformed);
    console.log("投入完了:", counts);
    return;
  }

  console.log("\nDATABASE_URL未指定のため、PGlite（ローカル使い捨て）で動作確認のみ行います");
  const client = new PGlite();
  const db = drizzlePglite(client, { schema });
  await migratePglite(db, { migrationsFolder: "./db/migrations" });
  const counts = await loadIntoDb(db, transformed);
  console.log("ローカル投入完了（このDBは破棄されます）:", counts);
  await client.close();
}

main().catch((e) => {
  console.error("移行に失敗しました:", e);
  process.exit(1);
});
