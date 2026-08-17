// gas/migrationExport.js が書き出したJSON（シート名ベースのオブジェクト配列）を、
// db/schema.tsのDrizzleテーブルへinsertできる形に変換する。
// 純粋関数のみで構成し、DB接続には依存しない（load.mjsがinsertを担当する）。

// raw_dataのisTransfer/isTargetは0/1の数値で保存されている
function numToBool(value) {
  return Number(value) === 1;
}

// categoryLocked/isFinalは真偽値のはずだが、シートの入力経緯によっては
// 文字列"TRUE"/"FALSE"や空文字になっていることがあるため、防御的に判定する
function toBool(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.trim().toUpperCase() === "TRUE";
  if (typeof value === "number") return value === 1;
  return false;
}

// 日付風の値をYYYY-MM-DD形式の文字列に正規化する。
// GAS側でJSON.stringifyを経由しているため、Dateオブジェクトだった値もISO文字列化された
// 状態で渡ってくる想定だが、"2025/12/01"のようなスラッシュ区切りの文字列である
// 可能性もあるため両方に対応する
function normalizeDate(value) {
  const s = String(value);
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  const slashMatch = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})/);
  if (slashMatch) {
    const [, y, m, d] = slashMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  throw new Error(`unrecognized date format: ${JSON.stringify(value)}`);
}

// 日時風の値をDateオブジェクトに変換する（Drizzleのtimestampカラムに渡す形式）
function normalizeTimestamp(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`unrecognized timestamp format: ${JSON.stringify(value)}`);
  }
  return date;
}

// GAS側でJSON文字列として保存されていたカラム（*Json）をパースする。
// 空文字・未設定の場合はfallbackを返す
function parseJsonColumn(value, fallback) {
  if (value === "" || value === undefined || value === null) return fallback;
  if (typeof value !== "string") return value; // 既にオブジェクトの場合はそのまま
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function transformRawData(rows) {
  return rows.map((row) => ({
    id: String(row.id),
    date: normalizeDate(row.date),
    content: String(row.content ?? ""),
    amount: Number(row.amount) || 0,
    institution: String(row.institution ?? ""),
    category: String(row.category ?? ""),
    subcategory: String(row.subcategory ?? ""),
    memo: String(row.memo ?? ""),
    isTransfer: numToBool(row.isTransfer),
    isTarget: numToBool(row.isTarget),
    importedAt: normalizeTimestamp(row.importedAt),
    updatedAt: normalizeTimestamp(row.updatedAt),
    categoryLocked: toBool(row.categoryLocked),
  }));
}

export function transformSettings(rows) {
  return rows.map((row) => ({ key: String(row.key), value: String(row.value ?? "") }));
}

export function transformCategories(rows) {
  return rows.map((row) => ({
    category: String(row.category),
    subcategory: String(row.subcategory),
    costType: row.costType === "fixed" ? "fixed" : "variable",
  }));
}

export function transformBudgets(rows) {
  return rows.map((row) => ({ category: String(row.category), monthlyBudget: Number(row.monthlyBudget) || 0 }));
}

export function transformAiAttributes(rows) {
  return rows.map((row) => ({ id: String(row.id), key: String(row.key), value: String(row.value ?? "") }));
}

export function transformAiMemory(rows) {
  return rows.map((row) => ({
    id: String(row.id),
    type: String(row.type),
    content: String(row.content ?? ""),
    category: String(row.category ?? ""),
    subcategory: String(row.subcategory ?? ""),
    createdAt: normalizeTimestamp(row.createdAt),
  }));
}

export function transformDecisions(rows) {
  return rows.map((row) => ({
    id: String(row.id),
    changedAt: normalizeTimestamp(row.changedAt),
    source: String(row.source ?? "manual"),
    type: String(row.type),
    target: String(row.target ?? ""),
    beforeAmount: row.beforeAmount === "" || row.beforeAmount === undefined ? null : Number(row.beforeAmount),
    afterAmount: Number(row.afterAmount) || 0,
    reason: String(row.reason ?? ""),
  }));
}

export function transformGoals(rows) {
  return rows.map((row) => ({ key: String(row.key), value: String(row.value ?? "") }));
}

// ai_chat_sessionは常に0件か1件（Issue #195参照）
export function transformAiChatSession(rows) {
  return rows.map((row) => ({
    updatedAt: normalizeTimestamp(row.updatedAt),
    messages: parseJsonColumn(row.messagesJson, []),
    history: parseJsonColumn(row.historyJson, []),
    quickReplies: parseJsonColumn(row.quickRepliesJson, []),
    isFinal: toBool(row.isFinal),
    todoActions: parseJsonColumn(row.todoActionsJson, []),
    categorySuggestions: parseJsonColumn(row.categorySuggestionsJson, []),
  }));
}

// エクスポートJSON全体（gas/migrationExport.jsの出力）を、db/schema.tsの各テーブルへ
// insertできる形にまとめて変換する
export function transformExport(exportData) {
  return {
    rawData: transformRawData(exportData.rawData ?? []),
    settings: transformSettings(exportData.settings ?? []),
    categories: transformCategories(exportData.categories ?? []),
    budgets: transformBudgets(exportData.budgets ?? []),
    aiAttributes: transformAiAttributes(exportData.aiAttributes ?? []),
    aiMemory: transformAiMemory(exportData.aiMemory ?? []),
    decisions: transformDecisions(exportData.decisions ?? []),
    goals: transformGoals(exportData.goals ?? []),
    aiChatSession: transformAiChatSession(exportData.aiChatSession ?? []),
  };
}
