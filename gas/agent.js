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
            "カテゴリ単位の集計では分からない具体的な支出を調べたいときに使う。",
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
            "必ずget_decision_historyで対象カテゴリ・項目の変更履歴を確認すること。",
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
