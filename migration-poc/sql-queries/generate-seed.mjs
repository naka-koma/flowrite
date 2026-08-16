// csv-cpu-benchmarkで生成したサンプルCSVを、D1のseed用INSERT文（SQL）に変換する。
// 実行: node migration-poc/sql-queries/generate-seed.mjs
import { readFileSync, writeFileSync } from "node:fs";

const csvPath = new URL("../csv-cpu-benchmark/sample-5000.csv", import.meta.url);
const text = readFileSync(csvPath, "utf-8");
const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
const dataLines = lines.slice(1);

function escapeSql(value) {
  return String(value).replace(/'/g, "''");
}

const values = dataLines.map((line) => {
  const [isTarget, date, content, amount, institution, category, subcategory, memo, isTransfer, id] =
    line.split(",");
  const isoDate = date.replace(/\//g, "-"); // YYYY/MM/DD -> YYYY-MM-DD
  const now = "2026-08-01T00:00:00.000Z";
  return `('${escapeSql(id)}', '${isoDate}', '${escapeSql(content)}', ${amount}, '${escapeSql(institution)}', '${escapeSql(category)}', '${escapeSql(subcategory)}', '${escapeSql(memo)}', ${isTransfer}, ${isTarget}, '${now}', '${now}', 0)`;
});

// D1（SQLite）は1ステートメントの長さに上限があるため、まとめて1つのINSERTにはできない。
// 実運用でもCSV一括アップロード時のバルクinsertはチャンク分割が必要になる、という発見も兼ねる
const CHUNK_SIZE = 200;
const chunks = [];
for (let i = 0; i < values.length; i += CHUNK_SIZE) {
  chunks.push(values.slice(i, i + CHUNK_SIZE));
}

const sql = chunks
  .map(
    (chunk) =>
      `INSERT INTO raw_data (id, date, content, amount, institution, category, subcategory, memo, is_transfer, is_target, imported_at, updated_at, category_locked) VALUES\n${chunk.join(",\n")};`,
  )
  .join("\n\n");

writeFileSync(new URL("./seed.sql", import.meta.url), sql + "\n", "utf-8");
console.log(`Generated seed.sql with ${values.length} rows in ${chunks.length} INSERT statements (chunk size ${CHUNK_SIZE})`);
