// AIが自分でデータを取りに行けるようにするツール群と、その実行ループ。
//
// 回答自体もrespond_to_userというツールとして宣言することで、構造化出力（responseSchema）を
// 使わずに従来と同じ形のレスポンスを受け取る。toolConfigのmode=ANYと組み合わせることで、
// モデルは必ず「データを取りに行く」か「回答する」かのどちらかに着地する。

// ツール呼び出しのラウンド数上限。GASの実行時間制限（6分）に対する安全策として設ける。
// 上限に達したターンではrespond_to_userのみを許可し、その時点の情報で回答させる
const AI_AGENT_MAX_TOOL_ROUNDS = 5;

// 明細取得ツールが一度に返す取引の上限。プロンプトが肥大化しないよう抑える
const AI_AGENT_MAX_TRANSACTIONS = 40;

// 定期支出検出ツールのデフォルト・上限値
const RECURRING_EXPENSES_DEFAULT_MONTHS = 6;
const RECURRING_EXPENSES_MAX_MONTHS = 24;
const RECURRING_EXPENSES_DEFAULT_MIN_OCCURRENCES = 3;
// プロンプトが肥大化しないよう、出現月数が多い順に上位のみ返す
const AI_AGENT_MAX_RECURRING_GROUPS = 20;
// 金額のばらつきがこの割合（変動係数）を超える場合、たまたま同じ店で買い物しただけの
// 可能性が高いとみなし、定期支出として誤検出しないよう除外する（取りこぼす方向に倒す）
const RECURRING_EXPENSES_MAX_COEFFICIENT_OF_VARIATION = 0.4;

// ツール宣言はCHAT_RESPONSE_SCHEMA（gemini.js）を参照するため、
// ファイルの読み込み順に依存しないよう関数内で組み立てる
function getAiAgentTools_() {
  return [
    {
      functionDeclarations: [
        {
          name: "get_summary",
          description:
            "指定した期間の収支サマリーを取得する。カテゴリ別の内訳と固定費・変動費の区分を含む。" +
            "unit=monthの場合は前月比・前年同月比も返る。ユーザーが期間を明示しない場合は、まず直近の月を調べること。",
          parameters: {
            type: "OBJECT",
            properties: {
              unit: { type: "STRING", enum: ["month", "year", "all"], description: "集計の単位。" },
              year: { type: "INTEGER", description: "unit=monthまたはyearの場合に必要な西暦年。" },
              month: { type: "INTEGER", description: "unit=monthの場合に必要な月（1〜12）。" },
            },
            required: ["unit"],
          },
        },
        {
          name: "get_trend",
          description: "収支の推移を取得する。増減の傾向を確認したいときに使う。",
          parameters: {
            type: "OBJECT",
            properties: {
              unit: { type: "STRING", enum: ["month", "year", "week"], description: "推移の粒度。" },
            },
            required: ["unit"],
          },
        },
        {
          name: "get_budget_variance",
          description: "指定した月の、カテゴリ別の予算と実績の乖離を取得する。",
          parameters: {
            type: "OBJECT",
            properties: {
              year: { type: "INTEGER", description: "西暦年。" },
              month: { type: "INTEGER", description: "月（1〜12）。" },
            },
            required: ["year", "month"],
          },
        },
        {
          name: "get_transactions",
          description:
            "指定した月の取引明細を取得する。使途不明金の中身を確認するなど、" +
            "カテゴリ単位の集計では分からない具体的な支出を調べたいときに使う。" +
            "結果に含まれるidは、明らかに分類が誤っている取引を見つけた際にcategory_suggestionsで指し示すのに使う。",
          parameters: {
            type: "OBJECT",
            properties: {
              year: { type: "INTEGER", description: "西暦年。" },
              month: { type: "INTEGER", description: "月（1〜12）。" },
              category: { type: "STRING", description: "絞り込む大項目名。省略時は全件。" },
              minAmount: { type: "INTEGER", description: "この金額以上の支出のみに絞る（絶対値・円）。" },
            },
            required: ["year", "month"],
          },
        },
        {
          name: "find_recurring_expenses",
          description:
            "複数月にまたがって繰り返し出ている支出（サブスクや固定費の疑いがあるもの）を検出する。" +
            "get_transactionsは単月しか見られないため、契約したまま使っていないサービスや" +
            "解約忘れのサブスクを探すには、こちらを使うこと。" +
            "「使途不明金をあぶり出したい」「固定費の歪みをチェックして」といった相談では、" +
            "対話の早い段階でこれを呼ぶことを検討すること。",
          parameters: {
            type: "OBJECT",
            properties: {
              months: { type: "INTEGER", description: "何ヶ月遡って調べるか。省略時は6、最大24。" },
              minOccurrences: {
                type: "INTEGER",
                description: "繰り返しとみなす最低出現月数。省略時は3。",
              },
            },
          },
        },
        {
          name: "get_decision_history",
          description:
            "過去に予算や目標をいつ・なぜ・いくらから変更したかの履歴を取得する。" +
            "以前の見直しが効いたのかを検証したいときや、同じ提案を繰り返さないために使う。",
          parameters: {
            type: "OBJECT",
            properties: {
              limit: { type: "INTEGER", description: "取得する件数。省略時は20件。" },
            },
          },
        },
        {
          name: "respond_to_user",
          description:
            "ユーザーに回答する。必要なデータが揃ったら必ずこの関数を呼ぶこと。" +
            "推測で答えず、根拠となるデータは先に他のツールで取得すること。" +
            "予算や目標の変更（todo_actions）を提案する場合は、respond_to_userを呼ぶ前に" +
            "必ずget_decision_historyで対象カテゴリ・項目の変更履歴を確認すること。" +
            "get_transactionsで見た取引の分類が明らかに誤っていると気づいた場合は、" +
            "category_suggestionsで指摘してよい。確信が持てない場合は含めないこと。",
          parameters: {
            type: "OBJECT",
            properties: CHAT_RESPONSE_SCHEMA.properties,
            required: CHAT_RESPONSE_SCHEMA.required,
          },
        },
      ],
    },
  ];
}

// サマリーは取引明細まで含むと巨大になるため、集計値と費目区分だけに絞って返す
function buildSummaryToolResult_(summary) {
  const { costTypes } = handleGetCategories();
  const categories = summary.categories.map((c) => ({
    name: c.name,
    total: c.total,
    costType: costTypes[c.name] === "fixed" ? "固定費" : "変動費",
  }));
  const fixedTotal = summary.categories
    .filter((c) => costTypes[c.name] === "fixed")
    .reduce((sum, c) => sum + c.total, 0);

  const result = {
    label: summary.label,
    totalExpense: summary.totalExpense,
    totalIncome: summary.totalIncome,
    balance: summary.totalIncome - summary.totalExpense,
    fixedTotal,
    variableTotal: summary.totalExpense - fixedTotal,
    categories,
    incomeCategories: summary.incomeCategories.map((c) => ({ name: c.name, total: c.total })),
  };

  if (summary.comparison) {
    result.comparison = summary.comparison;
  }

  return result;
}

function buildTransactionsToolResult_(args) {
  const list = handleTransactionList({
    year: args.year,
    month: args.month,
    page: 1,
    pageSize: 1000,
  });
  if (list.error) {
    return { error: list.error };
  }

  const category = (args.category || "").trim();
  const minAmount = Number(args.minAmount) || 0;

  let transactions = list.transactions.filter((t) => t.amount < 0);
  if (category) {
    transactions = transactions.filter((t) => t.category === category);
  }
  if (minAmount) {
    transactions = transactions.filter((t) => Math.abs(t.amount) >= minAmount);
  }

  // 金額の大きい順に返す。件数が多い場合は上位のみとし、省略した旨を伝える
  transactions.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
  const totalCount = transactions.length;
  const trimmed = transactions.slice(0, AI_AGENT_MAX_TRANSACTIONS).map((t) => ({
    id: t.id,
    date: t.date,
    content: t.content,
    amount: Math.abs(t.amount),
    institution: t.institution,
    category: t.category,
    subcategory: t.subcategory,
  }));

  return {
    totalCount,
    returnedCount: trimmed.length,
    note:
      totalCount > trimmed.length
        ? `該当${totalCount}件のうち金額上位${trimmed.length}件のみを返しています`
        : "",
    transactions: trimmed,
  };
}

// MoneyForwardの明細は同じサービスでも表記が揺れる（末尾に日付・番号が付く、
// カード会社によって区切り記号が違う等）ため、数字・記号・空白を落として比較する。
// 正規化しすぎると無関係な支出を誤って同一視するため、最小限の除去に留める
function normalizeExpenseContent_(content) {
  return String(content)
    .replace(/[0-9０-９]/g, "")
    .replace(/[\s　\-ー－_/.,:：()（）、]/g, "")
    .trim();
}

function formatMonthLabel_(date) {
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}

// raw_dataを1回だけ読み、正規化した内容ごとにグルーピングして
// 複数月にまたがる定期支出（サブスク・固定費の疑い）を検出する
function buildRecurringExpensesResult_(args) {
  const months = Math.min(
    Math.max(Number(args.months) || RECURRING_EXPENSES_DEFAULT_MONTHS, 1),
    RECURRING_EXPENSES_MAX_MONTHS,
  );
  const minOccurrences = Math.max(Number(args.minOccurrences) || RECURRING_EXPENSES_DEFAULT_MIN_OCCURRENCES, 2);

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

  const sheet = getRawDataSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return { monthsScanned: months, recurringExpenses: [] };
  }

  const data = sheet.getRange(2, 1, lastRow - 1, 13).getValues();
  const { costTypes } = handleGetCategories();

  // 正規化した内容をキーに、月ごとの出現をまとめる
  const groups = new Map();

  for (const row of data) {
    const isTarget = row[9];
    const isTransfer = row[8];
    if (isTarget !== 1 || isTransfer === 1) continue;

    const amount = row[3];
    if (amount >= 0) continue; // 支出のみ対象

    const date = new Date(row[1]);
    if (date < start) continue;

    const content = row[2];
    const normalized = normalizeExpenseContent_(content);
    // 正規化後に短すぎる文字列（記号・数字だけの内容など）は無関係な支出を
    // まとめてしまう誤検出の元になるため対象外にする
    if (normalized.length < 2) continue;

    if (!groups.has(normalized)) {
      groups.set(normalized, { sampleContent: content, category: row[5], subcategory: row[6], entries: [] });
    }
    groups.get(normalized).entries.push({
      monthKey: `${date.getFullYear()}-${date.getMonth() + 1}`,
      monthDate: new Date(date.getFullYear(), date.getMonth(), 1),
      amount: Math.abs(amount),
    });
  }

  const recurringExpenses = [];

  for (const group of groups.values()) {
    const monthKeys = new Set(group.entries.map((e) => e.monthKey));
    if (monthKeys.size < minOccurrences) continue;

    const amounts = group.entries.map((e) => e.amount);
    const avgAmount = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
    const variance = amounts.reduce((sum, a) => sum + (a - avgAmount) ** 2, 0) / amounts.length;
    const coefficientOfVariation = avgAmount > 0 ? Math.sqrt(variance) / avgAmount : 0;

    // 金額のばらつきが大きい場合は定期支出ではなく偶然の重複とみなし、除外する
    if (coefficientOfVariation > RECURRING_EXPENSES_MAX_COEFFICIENT_OF_VARIATION) continue;

    const sortedEntries = group.entries.slice().sort((a, b) => a.monthDate - b.monthDate);
    const firstEntry = sortedEntries[0];
    const lastEntry = sortedEntries[sortedEntries.length - 1];

    recurringExpenses.push({
      content: group.sampleContent,
      category: group.category,
      subcategory: group.subcategory,
      costType: costTypes[group.category] === "fixed" ? "固定費" : "変動費",
      occurrenceMonths: monthKeys.size,
      averageAmount: Math.round(avgAmount),
      latestAmount: lastEntry.amount,
      firstMonth: formatMonthLabel_(firstEntry.monthDate),
      lastMonth: formatMonthLabel_(lastEntry.monthDate),
    });
  }

  // 出現月数が多い順（＝より確実に定期支出とみなせる順）に並べ、上位のみ返す
  recurringExpenses.sort((a, b) => b.occurrenceMonths - a.occurrenceMonths);

  return {
    monthsScanned: months,
    totalGroups: recurringExpenses.length,
    recurringExpenses: recurringExpenses.slice(0, AI_AGENT_MAX_RECURRING_GROUPS),
  };
}

// ツール名から実処理へ振り分ける。エラーはthrowせずレスポンスに含め、
// モデルが状況を理解して別のツールを試せるようにする
function executeAiTool_(name, args) {
  const params = args || {};

  try {
    if (name === "get_summary") {
      const summary = handleSummary({
        unit: params.unit,
        year: params.year,
        month: params.month,
      });
      if (summary.error) {
        return { error: summary.error };
      }
      return buildSummaryToolResult_(summary);
    }

    if (name === "get_trend") {
      return handleTrend({ unit: params.unit });
    }

    if (name === "get_budget_variance") {
      const variance = handleGetBudgetVariance({ unit: "month", year: params.year, month: params.month });
      if (variance.error) {
        return { error: variance.error };
      }
      return variance;
    }

    if (name === "get_transactions") {
      return buildTransactionsToolResult_(params);
    }

    if (name === "get_decision_history") {
      return handleGetDecisions({ limit: params.limit });
    }

    if (name === "find_recurring_expenses") {
      return buildRecurringExpensesResult_(params);
    }

    return { error: `unknown tool: ${name}` };
  } catch (e) {
    Logger.log(`executeAiTool_ error (${name}): ${e.message}`);
    return { error: e.message };
  }
}

// AIが何を調べたのかを画面に出すための説明文。引数から日本語を組み立てる責務は
// GAS側に置き、フロントエンドはラベルをそのまま表示するだけにする
function describeToolCall_(name, args) {
  const a = args || {};

  if (name === "get_summary") {
    if (a.unit === "all") return "全期間の収支を確認";
    if (a.unit === "year") return `${a.year}年の収支を確認`;
    return `${a.year}年${a.month}月の収支を確認`;
  }

  if (name === "get_trend") {
    const unitLabel = a.unit === "year" ? "年次" : a.unit === "week" ? "週次" : "月次";
    return `${unitLabel}の推移を確認`;
  }

  if (name === "get_budget_variance") {
    return `${a.year}年${a.month}月の予算対比を確認`;
  }

  if (name === "get_decision_history") {
    return "予算・目標の変更履歴を確認";
  }

  if (name === "find_recurring_expenses") {
    const months = a.months || RECURRING_EXPENSES_DEFAULT_MONTHS;
    return `直近${months}ヶ月の繰り返し支出を確認`;
  }

  if (name === "get_transactions") {
    const conditions = [];
    if (a.category) conditions.push(a.category);
    if (a.minAmount) conditions.push(`${formatYen_(a.minAmount)}以上`);
    const suffix = conditions.length > 0 ? `（${conditions.join("・")}）` : "";
    return `${a.year}年${a.month}月の明細${suffix}を確認`;
  }

  return name;
}

function findFunctionCallPart_(parts) {
  for (const part of parts) {
    if (part.functionCall) {
      return part.functionCall;
    }
  }
  return null;
}

function joinTextParts_(parts) {
  return parts
    .map((p) => p.text)
    .filter((t) => t)
    .join("\n");
}

// モデルがrespond_to_userを呼ぶまでツール実行を繰り返す。
// contentsは呼び出し側から渡された会話履歴で、ツールのやり取りも追記して返す
// （サーバー側は状態を持たないステートレス設計を維持するため）
function runAiAgent_(apiKey, contents) {
  const tools = getAiAgentTools_();
  const workingContents = contents.slice();
  // 回答の根拠として、このターンで何を調べたのかを呼び出し元へ返す
  const toolCalls = [];

  for (let round = 0; round <= AI_AGENT_MAX_TOOL_ROUNDS; round++) {
    // 上限に達したターンはrespond_to_userのみ許可し、その時点の情報で必ず回答させる
    const isFinalRound = round === AI_AGENT_MAX_TOOL_ROUNDS;
    const config = isFinalRound
      ? { tools, allowedFunctionNames: ["respond_to_user"] }
      : { tools };

    const result = fetchGeminiParts_(apiKey, workingContents, config);
    if (!result.success) {
      return result;
    }

    workingContents.push({ role: "model", parts: result.parts });
    const functionCall = findFunctionCallPart_(result.parts);

    if (!functionCall) {
      // mode=ANYでも稀に素のテキストが返ることがあるため、それを回答として扱う
      const text = joinTextParts_(result.parts);
      if (!text) {
        return { success: false, error: "Geminiからの応答を解析できませんでした" };
      }
      return {
        success: true,
        parsed: { ai_message: text, quick_replies: [], is_final: false, todo_actions: [] },
        contents: workingContents,
        toolCalls,
      };
    }

    if (functionCall.name === "respond_to_user") {
      return { success: true, parsed: functionCall.args || {}, contents: workingContents, toolCalls };
    }

    const toolResult = executeAiTool_(functionCall.name, functionCall.args);
    toolCalls.push({
      name: functionCall.name,
      label: describeToolCall_(functionCall.name, functionCall.args),
    });
    Logger.log(`AI tool called: ${functionCall.name} ${JSON.stringify(functionCall.args)}`);

    workingContents.push({
      role: "user",
      parts: [{ functionResponse: { name: functionCall.name, response: toolResult } }],
    });
  }

  return { success: false, error: "Geminiからの応答を解析できませんでした" };
}
