// 移行後のDBスキーマ定義（Drizzle ORM）。
// 既存スプレッドシートの各シート構造（gas/spreadsheet.js参照）を1対1でテーブルに対応させる。
//
// 型の方針: 日付・真偽値はDBのネイティブ型（date/timestamp/boolean）を使う。
// スプレッドシート特有だった「文字列が勝手にDate型化される」問題（Issue #212で実際に
// 発生した不具合）は、スキーマが明示的なSQL DBでは起こらないため、GAS版で採用していた
// 「文字列で統一する」回避策はここでは不要。ただしAPIレスポンス（JSON）としてクライアントへ
// 返す際の日付表現は、フロントエンド側との取り決めとしてISO 8601文字列に統一する
// （DBの型とAPIのワイヤーフォーマットは別レイヤーの話として扱う）。
import { boolean, date, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

// raw_data: CSVから取り込んだ全トランザクションの蓄積
export const rawData = pgTable(
  "raw_data",
  {
    id: text("id").primaryKey(), // MoneyForwardのユニークID（重複排除キー）
    date: date("date").notNull(),
    content: text("content").notNull(),
    amount: integer("amount").notNull(), // 支出は負値、収入は正値
    institution: text("institution").notNull(),
    category: text("category").notNull().default(""),
    subcategory: text("subcategory").notNull().default(""),
    memo: text("memo").notNull().default(""),
    isTransfer: boolean("is_transfer").notNull().default(false),
    isTarget: boolean("is_target").notNull().default(true),
    importedAt: timestamp("imported_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    // カテゴリ上書き保護フラグ。AI分類提案の適用時・取引一覧画面での手動編集で true になる
    categoryLocked: boolean("category_locked").notNull().default(false),
  },
  // 月次集計（date範囲検索）とカテゴリ別集計（GROUP BY category）が主要なクエリパターンのため
  (table) => [index("raw_data_date_idx").on(table.date), index("raw_data_category_idx").on(table.category)],
);

// settings: AIアドバイスのプロンプト・使用モデルなどのキー・バリュー設定
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull().default(""),
});

// categories: 大項目・中項目のカテゴリマスタ（(category, subcategory)のペアで1行）
export const categories = pgTable(
  "categories",
  {
    category: text("category").notNull(),
    subcategory: text("subcategory").notNull(),
    // 大項目単位の費目区分。fixed=固定費、variable=変動費
    costType: text("cost_type").notNull().default("variable"),
  },
  (table) => [primaryKey({ columns: [table.category, table.subcategory] })],
);

// budgets: 大項目別の月間予算
export const budgets = pgTable("budgets", {
  category: text("category").primaryKey(),
  monthlyBudget: integer("monthly_budget").notNull(),
});

// ai_attributes: ユーザー属性情報
export const aiAttributes = pgTable("ai_attributes", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull(),
  value: text("value").notNull(),
});

// ai_memory: AIメモリ（気づき・傾向、分類パターン）
export const aiMemory = pgTable("ai_memory", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: text("type").notNull(), // "insight" | "categoryPattern"
  content: text("content").notNull(),
  category: text("category").notNull().default(""), // categoryPatternのみ使用
  subcategory: text("subcategory").notNull().default(""), // categoryPatternのみ使用
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// decisions: 予算・目標の変更履歴
export const decisions = pgTable("decisions", {
  id: uuid("id").primaryKey().defaultRandom(),
  changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
  source: text("source").notNull(), // "manual" | "ai"
  type: text("type").notNull(), // "budget" | "savingsTarget" | "specialReserve"
  target: text("target").notNull().default(""), // type=budgetの場合のみ対象の大項目名
  beforeAmount: integer("before_amount"),
  afterAmount: integer("after_amount").notNull(),
  reason: text("reason").notNull().default(""),
});

// goals: 家計の目標（月収・貯蓄目標・特別費積立）。settingsと同じキー・バリュー形式
export const goals = pgTable("goals", {
  key: text("key").primaryKey(),
  value: text("value").notNull().default(""),
});

// ai_chat_session: AIアドバイスの対話セッション。常に直近1件だけを上書き保存する
// （複数保持しない設計。Issue #195参照）ため、行は高々1件しか存在しない想定
export const aiChatSession = pgTable("ai_chat_session", {
  id: uuid("id").primaryKey().defaultRandom(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  // Geminiとの往復履歴・対話状態はネストした構造を持つため、GAS版のJSON文字列カラムから
  // Postgresネイティブのjsonb型に変更する（パース・シリアライズをDB層に任せられる）
  messages: jsonb("messages").notNull(),
  history: jsonb("history").notNull(),
  quickReplies: jsonb("quick_replies").notNull(),
  isFinal: boolean("is_final").notNull().default(false),
  todoActions: jsonb("todo_actions").notNull(),
  categorySuggestions: jsonb("category_suggestions").notNull(),
});

// ai_log: Gemini APIへのリクエスト・レスポンスの記録（追記のみ、削除・更新は行わない）
export const aiLog = pgTable("ai_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  context: text("context").notNull(),
  advice: text("advice").notNull(),
});
