// GEMINI_MODEL未設定時に試すモデルの優先順位。無料枠のクォータが大きいものから並べる。
const GEMINI_MODEL_FALLBACK_ORDER = ["gemini-3.5-flash", "gemini-3.1-flash-lite"];

// フォールバック対象のHTTPステータス。429=クォータ超過、503=一時的な高負荷。
// どちらも別モデルへの切り替えやリトライで回復しうる一時的なエラー。
const GEMINI_RETRYABLE_STATUS_CODES = [429, 503];

// 対話1ターンごとにGeminiへ要求する構造化出力のスキーマ。
// descriptionはプロンプトの一部としてGemini側の出力内容をガイドする役割も兼ねる
const CHAT_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    ai_message: {
      type: "STRING",
      description: "ユーザーへの問いかけ文。150〜200文字程度の短く親しみやすい文章（柔らかい標準語、タメ口）。",
    },
    quick_replies: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "ユーザーがワンタップで返せる選択肢。20文字以内のユーザー視点のセリフ（例: '外食が増えたかも'）。",
    },
    is_final: {
      type: "BOOLEAN",
      description: "会話の結論（着地点）に達した場合はtrue、対話を継続する場合はfalse。",
    },
    todo_actions: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          category: { type: "STRING" },
          new_budget: { type: "INTEGER" },
        },
        required: ["category", "new_budget"],
      },
      description: "is_finalがtrueの場合に設定される、来月に向けた予算見直し案のデータ配列。",
    },
  },
  required: ["ai_message", "quick_replies", "is_final"],
};

function getGeminiModelsToTry() {
  const configuredModel = getAiModel() || PropertiesService.getScriptProperties().getProperty("GEMINI_MODEL");
  return configuredModel ? [configuredModel] : GEMINI_MODEL_FALLBACK_ORDER;
}

function callGeminiChatApi_(model, apiKey, contents) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const payload = {
    contents,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: CHAT_RESPONSE_SCHEMA,
    },
  };
  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };

  const response = UrlFetchApp.fetch(url, options);
  return { code: response.getResponseCode(), body: response.getContentText() };
}

// モデルのフォールバック・リトライを行いつつ1ターン分のGemini応答を取得し、
// 構造化出力(JSON文字列)をパースして返す
function runGeminiChat_(apiKey, contents) {
  for (const model of getGeminiModelsToTry()) {
    const { code, body: responseBody } = callGeminiChatApi_(model, apiKey, contents);

    if (code === 200) {
      const json = JSON.parse(responseBody);
      const candidate = json.candidates && json.candidates[0] && json.candidates[0].content;
      const rawText = candidate ? candidate.parts[0].text : null;

      if (!rawText) {
        const blockReason = json.promptFeedback && json.promptFeedback.blockReason;
        Logger.log(`Gemini chat response has no candidates (model: ${model}): ${responseBody}`);
        return {
          success: false,
          error: blockReason
            ? `Geminiからの応答がブロックされました（理由: ${blockReason}）`
            : "Geminiからの応答に有効な候補がありません",
        };
      }

      let parsed;
      try {
        parsed = JSON.parse(rawText);
      } catch (e) {
        Logger.log(`Gemini chat response is not valid JSON (model: ${model}): ${rawText}`);
        return { success: false, error: "Geminiからの応答を解析できませんでした" };
      }

      return { success: true, parsed, rawText };
    }

    Logger.log(`Gemini chat API error (model: ${model}): ${responseBody}`);
    if (!GEMINI_RETRYABLE_STATUS_CODES.includes(code)) {
      break;
    }
  }

  return { success: false, error: "Gemini API request failed" };
}

function formatYen_(amount) {
  return `${amount.toLocaleString("ja-JP")}円`;
}

// handleSummaryの結果からAIへ渡すコンテキスト文を組み立てる。
// データが無い期間の場合は空文字を返す
function buildAiContext_(summary) {
  const hasData = summary.categories.length > 0 || summary.totalExpense > 0 || summary.totalIncome > 0;
  if (!hasData) {
    return "";
  }

  const categoryText = summary.categories.map((c) => `${c.name}: ${formatYen_(c.total)}`).join("、");
  return `${summary.label}: 支出${formatYen_(summary.totalExpense)}、収入${formatYen_(summary.totalIncome)}${categoryText ? `（内訳: ${categoryText}）` : ""}`;
}

// 登録されているユーザー属性情報を「# ユーザーの属性・前提条件」セクションとして組み立てる。
// 未登録の場合は空文字を返す
function buildAiAttributesSection_() {
  const { attributes } = handleGetAiAttributes();
  if (attributes.length === 0) {
    return "";
  }

  const lines = attributes.map((a) => `- ${a.key}: ${a.value}`).join("\n");
  return (
    "# ユーザーの属性・前提条件\n" +
    "あなたは一般的な平均値と比較するだけでなく、以下のライフスタイルや価値観を持つ人物にとって「本当に最適なバランスか」という視点でデータを分析する必要があります。\n" +
    lines
  );
}

// ユーザーが選んだ分析期間に関わらず、予算は月単位で管理されているため
// 常に「今月」の予算対比を固定コンテキストとして注入する
function buildBudgetVarianceSection_() {
  const now = new Date();
  const variance = handleGetBudgetVariance({ unit: "month", year: now.getFullYear(), month: now.getMonth() + 1 });
  if (!variance.entries || variance.entries.length === 0) {
    return "";
  }

  const lines = variance.entries
    .map((e) => {
      const sign = e.variance > 0 ? "+" : "";
      return `${e.category}: 予算${formatYen_(e.budget)}、実績${formatYen_(e.actual)}、乖離${sign}${formatYen_(e.variance)}`;
    })
    .join("\n");
  return `# 今月の予算対比\n${lines}`;
}

// 対話の最初のターン。テーマ選択直後に呼ばれ、以後のターンで往復させる履歴を組み立てて返す
// （サーバー側は対話状態を保持しないステートレス設計）
function handleStartAiChat(body) {
  try {
    const agendaTopic = ((body && body.agendaTopic) || "").trim();
    if (!agendaTopic) {
      return { success: false, error: "agendaTopic is required" };
    }

    const summaryParams = (body && body.summaryParams) || {};
    const summary = handleSummary(summaryParams);
    if (summary.error) {
      return { success: false, error: summary.error };
    }

    const apiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
    if (!apiKey) {
      return { success: false, error: "GEMINI_API_KEY is not set in script properties" };
    }

    const dataContext = buildAiContext_(summary);
    const varianceSection = buildBudgetVarianceSection_();

    if (!dataContext && !varianceSection) {
      return { success: false, error: "指定した期間のデータがありません" };
    }

    const attributesSection = buildAiAttributesSection_();
    const sections = [
      attributesSection,
      getAiPrompt(),
      dataContext ? `# 分析対象データ\n${dataContext}` : "",
      varianceSection,
      `# 相談テーマ\n${agendaTopic}`,
    ].filter((s) => s);
    const initialPrompt = sections.join("\n\n");

    const result = runGeminiChat_(apiKey, [{ role: "user", parts: [{ text: initialPrompt }] }]);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    const { ai_message, quick_replies, is_final, todo_actions } = result.parsed;
    const history = [
      { role: "user", text: initialPrompt },
      { role: "model", text: result.rawText },
    ];

    getAiLogSheet().appendRow([new Date().toISOString(), initialPrompt, ai_message]);

    return {
      success: true,
      ai_message,
      quick_replies: quick_replies || [],
      is_final: !!is_final,
      todo_actions: todo_actions || [],
      history,
    };
  } catch (e) {
    Logger.log(`handleStartAiChat unexpected error: ${e.message}`);
    return { success: false, error: e.message };
  }
}

// quick_reply選択後の継続ターン。フロントエンドから渡された履歴に
// ユーザーの返信を追加してGeminiへ送り、更新後の履歴を返す
function handleContinueAiChat(body) {
  try {
    const history = Array.isArray(body && body.history) ? body.history : [];
    const userReply = ((body && body.userReply) || "").trim();
    if (history.length === 0 || !userReply) {
      return { success: false, error: "history and userReply are required" };
    }

    const apiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
    if (!apiKey) {
      return { success: false, error: "GEMINI_API_KEY is not set in script properties" };
    }

    const nextHistory = history.concat([{ role: "user", text: userReply }]);
    const contents = nextHistory.map((turn) => ({ role: turn.role, parts: [{ text: turn.text }] }));

    const result = runGeminiChat_(apiKey, contents);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    const { ai_message, quick_replies, is_final, todo_actions } = result.parsed;
    const updatedHistory = nextHistory.concat([{ role: "model", text: result.rawText }]);

    getAiLogSheet().appendRow([new Date().toISOString(), userReply, ai_message]);

    return {
      success: true,
      ai_message,
      quick_replies: quick_replies || [],
      is_final: !!is_final,
      todo_actions: todo_actions || [],
      history: updatedHistory,
    };
  } catch (e) {
    Logger.log(`handleContinueAiChat unexpected error: ${e.message}`);
    return { success: false, error: e.message };
  }
}
