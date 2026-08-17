// transform.mjsが変換したデータを、Drizzleのdbインスタンスへチャンク分割してinsertする。
// dbインスタンスは呼び出し側が用意する（PGlite/Neonいずれでも同じ関数が使える）。
// Phase 1のPoC（migration-poc/findings.md）で判明した「1ステートメントが長すぎると失敗する」
// 問題を踏まえ、チャンク単位でinsertする。
import * as schema from "../schema.ts";
import type { transformExport } from "./transform.mjs";

const CHUNK_SIZE = 200;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

// PGlite用drizzle()とNeon用drizzle()はドライバごとに型パラメータが異なり、
// 共通の型で受けようとすると複雑になりすぎるため、dbはunknown経由で受ける
// （移行専用のツールスクリプトであり、frontend/srcの「any禁止」規約の対象外）
async function insertInChunks<T extends Record<string, unknown>>(
  db: unknown,
  table: unknown,
  rows: T[],
): Promise<number> {
  if (rows.length === 0) return 0;
  const typedDb = db as { insert: (t: unknown) => { values: (v: T[]) => Promise<unknown> } };
  for (const part of chunk(rows, CHUNK_SIZE)) {
    await typedDb.insert(table).values(part);
  }
  return rows.length;
}

type Transformed = ReturnType<typeof transformExport>;

export async function loadIntoDb(db: unknown, transformed: Transformed) {
  // raw_dataが最も件数が多く時間がかかるため最初に投入する。
  // 他のテーブルは相互に依存しないため順不同で問題ない
  const counts = {
    rawData: await insertInChunks(db, schema.rawData, transformed.rawData),
    settings: await insertInChunks(db, schema.settings, transformed.settings),
    categories: await insertInChunks(db, schema.categories, transformed.categories),
    budgets: await insertInChunks(db, schema.budgets, transformed.budgets),
    aiAttributes: await insertInChunks(db, schema.aiAttributes, transformed.aiAttributes),
    aiMemory: await insertInChunks(db, schema.aiMemory, transformed.aiMemory),
    decisions: await insertInChunks(db, schema.decisions, transformed.decisions),
    goals: await insertInChunks(db, schema.goals, transformed.goals),
    aiChatSession: await insertInChunks(db, schema.aiChatSession, transformed.aiChatSession),
  };

  return counts;
}
