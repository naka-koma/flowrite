// GEMINI_MODEL未設定時に試すモデルの優先順位。無料枠のクォータが大きいものから並べる。
const GEMINI_MODEL_FALLBACK_ORDER = ["gemini-3.5-flash", "gemini-3.1-flash-lite"];

// フォールバック対象のHTTPステータス。429=クォータ超過、503=一時的な高負荷。
// どちらも別モデルへの切り替えやリトライで回復しうる一時的なエラー。
const GEMINI_RETRYABLE_STATUS_CODES = [429, 503];

// 見直し案として提案できるアクションの種別。
// budgetはカテゴリ別の支出予算、他の2つは家計の目標（goals）側に反映される
const AI_TODO_ACTION_TYPES = ["budget", "savingsTarget", "specialReserve"];

// 対話1ターンごとにGeminiへ要求する構造化出力のスキーマ。
// descriptionはプロンプトの一部としてGemini側の出力内容をガイドする役割も兼ねる
const CHAT_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    ai_message: {
      type: "STRING",
      description:
        "ユーザーへの問いかけ文（柔らかい標準語、タメ口）。要点が複数ある場合は見出し・箇条書きなどのMarkdown記法で構造化してよい。" +
        "改行はエスケープせず実際の改行文字を使うこと。冗長にならないよう、長くても400文字程度に収めること。",
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
          type: {
            type: "STRING",
            enum: AI_TODO_ACTION_TYPES,
            description:
              "budget=カテゴリ別の月間支出予算、savingsTarget=月次の目標貯蓄額、specialReserve=帰省やイベントなど不定期支出に備える月々の積立額。",
          },
          category: { type: "STRING", description: "type=budgetの場合のみ設定する対象の大項目名。" },
          amount: { type: "INTEGER", description: "設定する月額（円）。" },
        },
        required: ["type", "amount"],
      },
      description:
        "is_finalがtrueの場合に設定される、来月に向けた見直し案の配列。" +
        "貯蓄や積立はカテゴリ別の支出予算ではないため、type=budgetで提案してはいけない。" +
        "貯蓄はsavingsTarget、不定期支出への積立はspecialReserveを使うこと。",
    },
  },
  required: ["ai_message", "quick_replies", "is_final"],
};

function getGeminiModelsToTry() {
  const configuredModel = getAiModel() || PropertiesService.getScriptProperties().getProperty("GEMINI_MODEL");
  return configuredModel ? [configuredModel] : GEMINI_MODEL_FALLBACK_ORDER;
}

// configは { responseSchema } （構造化出力）か { tools, allowedFunctionNames } （function calling）のいずれか。
// 構造化出力とtoolsは併用できないため、呼び出し側でどちらかを選ぶ
function callGeminiChatApi_(model, apiKey, contents, config) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const payload = { contents };

  if (config.tools) {
    payload.tools = config.tools;
    // ANY = 必ずいずれかの関数を呼ばせる。回答自体もrespond_to_userという関数のため、
    // これで「データを取りに行く」か「回答する」かのどちらかに必ず着地する
    const functionCallingConfig = { mode: "ANY" };
    if (config.allowedFunctionNames) {
      functionCallingConfig.allowedFunctionNames = config.allowedFunctionNames;
    }
    payload.toolConfig = { functionCallingConfig };
  } else {
    payload.generationConfig = {
      responseMimeType: "application/json",
      responseSchema: config.responseSchema,
    };
  }

  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };

  const response = UrlFetchApp.fetch(url, options);
  return { code: response.getResponseCode(), body: response.getContentText() };
}

// モデルのフォールバック・リトライを行い、Geminiの応答パート配列をそのまま返す。
// function callingではtextではなくfunctionCallパートが返るため、パート単位で扱う
function fetchGeminiParts_(apiKey, contents, config) {
  for (const model of getGeminiModelsToTry()) {
    const { code, body: responseBody } = callGeminiChatApi_(model, apiKey, contents, config);

    if (code === 200) {
      const json = JSON.parse(responseBody);
      const candidate = json.candidates && json.candidates[0] && json.candidates[0].content;
      const parts = candidate && candidate.parts;

      if (!parts || parts.length === 0) {
        const blockReason = json.promptFeedback && json.promptFeedback.blockReason;
        Logger.log(`Gemini chat response has no candidates (model: ${model}): ${responseBody}`);
        return {
          success: false,
          error: blockReason
            ? `Geminiからの応答がブロックされました（理由: ${blockReason}）`
            : "Geminiからの応答に有効な候補がありません",
        };
      }

      return { success: true, parts };
    }

    Logger.log(`Gemini chat API error (model: ${model}): ${responseBody}`);
    if (!GEMINI_RETRYABLE_STATUS_CODES.includes(code)) {
      break;
    }
  }

  return { success: false, error: "Gemini API request failed" };
}

// 構造化出力で1ターン分のGemini応答を取得し、JSON文字列をパースして返す
function runGeminiChat_(apiKey, contents, responseSchema) {
  const result = fetchGeminiParts_(apiKey, contents, { responseSchema });
  if (!result.success) {
    return result;
  }

  const rawText = result.parts[0].text;
  if (!rawText) {
    return { success: false, error: "Geminiからの応答に有効な候補がありません" };
  }

  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch (e) {
    Logger.log(`Gemini chat response is not valid JSON: ${rawText}`);
    return { success: false, error: "Geminiからの応答を解析できませんでした" };
  }

  return { success: true, parsed, rawText };
}

// Geminiが構造化出力のJSON文字列内で改行を二重エスケープして返すことがあり、
// JSON.parse後にバックスラッシュと n の2文字が残る。表示・メモリ・ログの
// すべてに一貫して効くよう、GAS側で実際の改行文字に戻す
function normalizeAiText_(text) {
  if (typeof text !== "string") {
    return text;
  }
  return text.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n").replace(/\\t/g, "\t");
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

  // 固定費・変動費のどちらの支出なのかを併記し、構造的な改善と日々の節約を区別できるようにする
  const { costTypes } = handleGetCategories();
  const categoryText = summary.categories
    .map((c) => `${c.name}（${costTypes[c.name] === "fixed" ? "固定費" : "変動費"}）: ${formatYen_(c.total)}`)
    .join("、");
  const fixedTotal = summary.categories
    .filter((c) => costTypes[c.name] === "fixed")
    .reduce((sum, c) => sum + c.total, 0);
  const costTypeText = `固定費計${formatYen_(fixedTotal)}、変動費計${formatYen_(summary.totalExpense - fixedTotal)}`;

  return (
    `${summary.label}: 支出${formatYen_(summary.totalExpense)}、収入${formatYen_(summary.totalIncome)}` +
    `（${costTypeText}）${categoryText ? `\n内訳: ${categoryText}` : ""}`
  );
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

// ユーザーが明示的に「覚えておく」操作をした気づき・傾向のメモリを
// 「# 過去の気づき・傾向」セクションとして組み立てる。未登録の場合は空文字を返す
function buildAiMemoryInsightsSection_() {
  const { memories } = handleGetAiMemories();
  const insights = memories.filter((m) => m.type === "insight");
  if (insights.length === 0) {
    return "";
  }

  const lines = insights.map((m) => `- ${m.content}`).join("\n");
  return `# 過去の気づき・傾向\n${lines}`;
}

// ユーザーが明示的に記憶した分類パターンを、AI分類提案プロンプトへの
// 参考例テキストとして組み立てる。未登録の場合は空文字を返す
function buildCategoryPatternExamplesText_() {
  const { memories } = handleGetAiMemories();
  const patterns = memories.filter((m) => m.type === "categoryPattern");
  if (patterns.length === 0) {
    return "";
  }

  return patterns.map((m) => `${m.content} → ${m.category}:${m.subcategory}`).join("\n");
}

// 「覚えておく」操作時の元テキストを、事実・気づきのみの簡潔な文に要約するためのスキーマ
const INSIGHT_SUMMARY_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    summary: {
      type: "STRING",
      description: "挨拶・相槌・提案の言い回しを除いた、事実・気づき・傾向のみを1〜2文、40字程度で簡潔にまとめたもの。",
    },
  },
  required: ["summary"],
};

// ユーザーが「覚えておく」を押した際、元のAI回答を今後の分析に再利用しやすい
// 簡潔な形に要約する。失敗時は呼び出し元が元テキストへフォールバックできるようerrorを返す
function handleSummarizeAiInsight(body) {
  try {
    const text = ((body && body.text) || "").trim();
    if (!text) {
      return { success: false, error: "text is required" };
    }

    const apiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
    if (!apiKey) {
      return { success: false, error: "GEMINI_API_KEY is not set in script properties" };
    }

    const prompt =
      "以下は家計相談でAIが回答した内容です。今後の分析に再利用できるよう、" +
      "挨拶・相槌・提案の言い回しを除いた事実・気づき・傾向だけを1〜2文、40字程度で簡潔に要約してください。\n\n" +
      `# 元の回答\n${text}`;

    const result = runGeminiChat_(
      apiKey,
      [{ role: "user", parts: [{ text: prompt }] }],
      INSIGHT_SUMMARY_RESPONSE_SCHEMA,
    );
    if (!result.success) {
      return { success: false, error: result.error };
    }

    const summary = (result.parsed.summary || "").trim();
    if (!summary) {
      return { success: false, error: "要約結果が空でした" };
    }

    return { success: true, summary };
  } catch (e) {
    Logger.log(`handleSummarizeAiInsight unexpected error: ${e.message}`);
    return { success: false, error: e.message };
  }
}

// 「気づき・傾向」メモリ一覧の整理1回分のレスポンススキーマ
const CONSOLIDATE_INSIGHTS_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    insights: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "重複統合・一般化した後の気づき・傾向。1件あたり40字程度。",
    },
  },
  required: ["insights"],
};

// 蓄積された「気づき・傾向」メモリをGeminiに分析させ、重複統合・一般化した内容に置き換える。
// 対象が0〜1件の場合は整理不要としてそのまま返す
function handleConsolidateAiMemoryInsights() {
  try {
    const { memories } = handleGetAiMemories();
    const insights = memories.filter((m) => m.type === "insight");
    if (insights.length < 2) {
      return { success: true, changed: false, memories };
    }

    const apiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
    if (!apiKey) {
      return { success: false, error: "GEMINI_API_KEY is not set in script properties" };
    }

    const listText = insights.map((m, i) => `${i + 1}. ${m.content}`).join("\n");
    const prompt =
      "以下は家計管理アプリに蓄積された「気づき・傾向」のメモリ一覧です。" +
      "内容が重複・類似しているものは1件に統合し、一般化できるものはより汎用的な表現にまとめてください。" +
      "古くなった・他の項目と矛盾する内容は除外して構いません。各項目は40字程度の簡潔な文にしてください。\n\n" +
      `# 現在の気づき・傾向一覧\n${listText}`;

    const result = runGeminiChat_(
      apiKey,
      [{ role: "user", parts: [{ text: prompt }] }],
      CONSOLIDATE_INSIGHTS_RESPONSE_SCHEMA,
    );
    if (!result.success) {
      return { success: false, error: result.error };
    }

    const consolidated = Array.isArray(result.parsed.insights)
      ? result.parsed.insights.map((s) => String(s).trim()).filter((s) => s)
      : [];
    if (consolidated.length === 0) {
      return { success: false, error: "整理結果が空でした" };
    }

    replaceAiMemoryInsights_(consolidated);
    return { success: true, changed: true, memories: handleGetAiMemories().memories };
  } catch (e) {
    Logger.log(`handleConsolidateAiMemoryInsights unexpected error: ${e.message}`);
    return { success: false, error: e.message };
  }
}

// 推移としてプロンプトに含める直近の月数。長すぎるとプロンプトが冗長になるため絞る
const AI_TREND_POINT_LIMIT = 6;

// 設定済みの家計の目標を「# 家計の目標」セクションとして組み立てる。
// 支出の多寡を評価する基準になるため、カテゴリ予算の合計との差分も併せて渡す。
// 定期収入が未設定の場合は目標が成立しないため空文字を返す
function buildGoalsSection_() {
  const goals = handleGetGoals();
  if (!goals.monthlyIncome) {
    return "";
  }

  const { budgets } = handleGetBudgets();
  const { costTypes } = handleGetCategories();
  const totalBudget = budgets.reduce((sum, b) => sum + b.monthlyBudget, 0);
  const fixedBudget = budgets
    .filter((b) => costTypes[b.category] === "fixed")
    .reduce((sum, b) => sum + b.monthlyBudget, 0);
  const difference = goals.spendableTotal - totalBudget;
  const differenceText =
    difference < 0
      ? `カテゴリ予算の合計が使える総額を${formatYen_(Math.abs(difference))}超過している（目標達成には予算の見直しが必要）`
      : `カテゴリ予算の合計は使える総額に対して${formatYen_(difference)}の余裕がある`;
  const targetSuffix = goals.savingsTargetMode === "rate" ? `（収入の${goals.savingsTargetRate}%）` : "";

  return (
    "# 家計の目標\n" +
    "この家計は以下の月次目標を掲げています。支出の多寡は一般論ではなく、この目標に照らして評価してください。\n" +
    `- 定期収入（手取り月額。ボーナスを含まない）: ${formatYen_(goals.monthlyIncome)}\n` +
    `- 目標貯蓄額: ${formatYen_(goals.resolvedSavingsTarget)}${targetSuffix}\n` +
    `- 特別費積立額（不定期支出に備える月々の積立）: ${formatYen_(goals.specialReserveAmount)}\n` +
    `- 使える総額（定期収入 − 目標貯蓄額 − 特別費積立額）: ${formatYen_(goals.spendableTotal)}\n` +
    `- 設定済みカテゴリ予算の合計: ${formatYen_(totalBudget)}` +
    `（うち固定費 ${formatYen_(fixedBudget)}、変動費 ${formatYen_(totalBudget - fixedBudget)}）\n` +
    `- ${differenceText}\n` +
    "固定費の見直しは一度行えば毎月自動的に効くのに対し、変動費の節約は毎月意識し続ける必要があります。" +
    "改善を提案する際はこの違いを踏まえ、どちらの性質の打ち手なのかが伝わるようにしてください。"
  );
}

// 増減は今期間から見た差分（プラスなら今期間のほうが多い）として表現する
function formatDiff_(diff) {
  return `${diff > 0 ? "+" : ""}${formatYen_(diff)}`;
}

function formatComparisonLine_(name, comparison) {
  return (
    `- ${name}（${comparison.label}）との比較: ` +
    `支出 ${formatDiff_(comparison.expenseDiff)}、収入 ${formatDiff_(comparison.incomeDiff)}、収支 ${formatDiff_(comparison.balanceDiff)}`
  );
}

// 前月比・前年同月比と直近数ヶ月の推移を「# 時系列の変化」セクションとして組み立てる。
// これがないとAIは単月の断面しか見られず、増減の傾向を指摘できない
function buildTrendSection_(summary) {
  const lines = [];

  // comparisonはunit=month時のみ存在する
  if (summary.comparison) {
    lines.push(formatComparisonLine_("前月", summary.comparison.previousMonth));
    lines.push(formatComparisonLine_("前年同月", summary.comparison.previousYear));
  }

  const { points } = handleTrend({ unit: "month" });
  const recentPoints = points.slice(-AI_TREND_POINT_LIMIT);
  if (recentPoints.length > 0) {
    const pointLines = recentPoints
      .map((p) => `  - ${p.label}: 支出${formatYen_(p.totalExpense)}、収入${formatYen_(p.totalIncome)}`)
      .join("\n");
    lines.push(`- 直近${recentPoints.length}ヶ月の推移:\n${pointLines}`);
  }

  if (lines.length === 0) {
    return "";
  }

  return `# 時系列の変化\n${lines.join("\n")}`;
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

// 「気になる点」提案1件分のレスポンススキーマ
const FOCUS_POINTS_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    focusPoints: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING", description: "一覧表示用の短いラベル。20文字程度。" },
          context: {
            type: "STRING",
            description: "この点について深掘り対話を始める際の詳細な状況説明。50〜100文字程度。",
          },
        },
        required: ["title", "context"],
      },
      description: "ユーザーが深掘りしたくなりそうな「気になる点」を2〜4件。",
    },
  },
  required: ["focusPoints"],
};

// AIアドバイスウィザードの②ステップ。データ・予算対比・ユーザー属性・過去の気づき・
// 関心テーマを踏まえ、Geminiに「気になる点」の候補を提示させる
function handleGetAiFocusPoints(body) {
  try {
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
    const memoryInsightsSection = buildAiMemoryInsightsSection_();
    const agendaTopicsSection = `# ユーザーが関心を持ちやすいテーマ（参考）\n${getAgendaTopics().join("、")}`;
    const sections = [
      attributesSection,
      memoryInsightsSection,
      "あなたは家計管理のアドバイザーです。以下の支出データを分析し、ユーザーが深掘りしたくなりそうな「気になる点」を2〜4件提示してください。",
      buildGoalsSection_(),
      dataContext ? `# 分析対象データ\n${dataContext}` : "",
      buildTrendSection_(summary),
      varianceSection,
      agendaTopicsSection,
    ].filter((s) => s);
    const prompt = sections.join("\n\n");

    const result = runGeminiChat_(apiKey, [{ role: "user", parts: [{ text: prompt }] }], FOCUS_POINTS_RESPONSE_SCHEMA);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    const focusPoints = Array.isArray(result.parsed.focusPoints) ? result.parsed.focusPoints : [];
    return { success: true, focusPoints };
  } catch (e) {
    Logger.log(`handleGetAiFocusPoints unexpected error: ${e.message}`);
    return { success: false, error: e.message };
  }
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
    const memoryInsightsSection = buildAiMemoryInsightsSection_();
    const sections = [
      attributesSection,
      memoryInsightsSection,
      getAiPrompt(),
      buildGoalsSection_(),
      dataContext ? `# 分析対象データ\n${dataContext}` : "",
      buildTrendSection_(summary),
      varianceSection,
      `# 相談テーマ\n${agendaTopic}`,
    ].filter((s) => s);
    const initialPrompt = sections.join("\n\n");

    // 初期コンテキストは足がかりとして渡し、追加のデータはAIがツールで取りに行く
    const result = runAiAgent_(apiKey, [{ role: "user", parts: [{ text: initialPrompt }] }]);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    const { quick_replies, is_final, todo_actions } = result.parsed;
    const ai_message = normalizeAiText_(result.parsed.ai_message);

    getAiLogSheet().appendRow([new Date().toISOString(), initialPrompt, ai_message]);

    return {
      success: true,
      ai_message,
      quick_replies: quick_replies || [],
      is_final: !!is_final,
      todo_actions: todo_actions || [],
      history: result.contents,
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

    // historyはGeminiのcontents形式をそのまま往復させている（サーバーは状態を持たない）
    const nextContents = history.concat([{ role: "user", parts: [{ text: userReply }] }]);

    const result = runAiAgent_(apiKey, nextContents);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    const { quick_replies, is_final, todo_actions } = result.parsed;
    const ai_message = normalizeAiText_(result.parsed.ai_message);

    getAiLogSheet().appendRow([new Date().toISOString(), userReply, ai_message]);

    return {
      success: true,
      ai_message,
      quick_replies: quick_replies || [],
      is_final: !!is_final,
      todo_actions: todo_actions || [],
      history: result.contents,
    };
  } catch (e) {
    Logger.log(`handleContinueAiChat unexpected error: ${e.message}`);
    return { success: false, error: e.message };
  }
}

// 対話で合意した見直し案を予算・家計の目標へ反映する。
// 予算と目標の両方に跨るため、フロントエンドから個別に呼ばずGAS側でまとめて処理する
function handleApplyAiTodoActions(body) {
  try {
    const actions = Array.isArray(body && body.actions) ? body.actions : [];
    if (actions.length === 0) {
      return { success: false, error: "actions is required" };
    }

    const goalUpdates = {};

    for (const action of actions) {
      const amount = Number(action.amount);
      if (!Number.isFinite(amount) || amount < 0) {
        return { success: false, error: "amount must be a non-negative number" };
      }

      if (action.type === "budget") {
        const category = (action.category || "").trim();
        if (!category) {
          return { success: false, error: "category is required for budget action" };
        }
        const result = handleUpsertBudget({ category, monthlyBudget: amount });
        if (!result.success) {
          return { success: false, error: result.error };
        }
      } else if (action.type === "savingsTarget") {
        // AIは金額で提案するため、率モードで設定されていた場合は定額モードへ切り替える
        goalUpdates.savingsTargetMode = "amount";
        goalUpdates.savingsTargetAmount = amount;
      } else if (action.type === "specialReserve") {
        goalUpdates.specialReserveAmount = amount;
      } else {
        return { success: false, error: `unknown action type: ${action.type}` };
      }
    }

    if (Object.keys(goalUpdates).length > 0) {
      const result = handleUpdateGoals(goalUpdates);
      if (!result.success) {
        return { success: false, error: result.error };
      }
    }

    return { success: true, applied: actions.length };
  } catch (e) {
    Logger.log(`handleApplyAiTodoActions unexpected error: ${e.message}`);
    return { success: false, error: e.message };
  }
}

// AI分類提案1バッチ分のレスポンススキーマ
const CATEGORY_SUGGESTION_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    suggestions: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          id: { type: "STRING", description: "分類対象データのidをそのまま返す" },
          category: { type: "STRING", description: "候補一覧の中から最も適切な大項目" },
          subcategory: { type: "STRING", description: "候補一覧の中から最も適切な中項目" },
          reason: { type: "STRING", description: "分類理由。20文字程度の短い説明" },
        },
        required: ["id", "category", "subcategory", "reason"],
      },
    },
  },
  required: ["suggestions"],
};

// 1バッチあたりGeminiに渡す取引件数
const CATEGORY_SUGGESTION_BATCH_SIZE = 25;

// 1回のhandleGetAiCategorySuggestions呼び出しで処理する対象件数の上限。
// GASの実行時間制限（6分）に対する安全策として、分割実行はせず超過時はユーザーにスコープ絞り込みを促す
const MAX_AI_CATEGORY_TARGET_ROWS = 150;

function buildCategoryPairsText_(categories) {
  const lines = [];
  Object.keys(categories).forEach((category) => {
    categories[category].forEach((subcategory) => {
      lines.push(`${category}:${subcategory}`);
    });
  });
  return lines.join("、");
}

function buildCategorySuggestionPrompt_(rows, categoryPairsText) {
  const rowsText = rows
    .map((r) => `${r.id} | ${r.date} | ${r.content} | ${formatYen_(r.amount)} | ${r.institution}`)
    .join("\n");

  const patternExamplesText = buildCategoryPatternExamplesText_();
  const patternSection = patternExamplesText
    ? `\n\n# 過去に記憶した分類パターン（参考）\n${patternExamplesText}`
    : "";

  return (
    "あなたは家計簿アプリの取引分類アシスタントです。以下の取引データそれぞれに対し、" +
    "「利用可能な大項目:中項目の一覧」の中から最も適切な組み合わせを1つ選んでください。\n" +
    "一覧内に適切な組み合わせが見つからない場合に限り、新しい大項目・中項目を提案しても構いません。" +
    "その場合はcategory/subcategoryに新しい名称を記入してください。ただし安易な新設は避け、" +
    "既存の一覧に近いものがあればそちらを優先してください。\n\n" +
    `# 利用可能な大項目:中項目の一覧\n${categoryPairsText}\n\n` +
    `# 分類対象データ (id | 日付 | 内容 | 金額 | 金融機関)\n${rowsText}` +
    patternSection
  );
}

// 指定した年月の取引に対し、Geminiにカテゴリ分類を提案させる。
// scope="uncategorized"なら大項目が空の行のみ、"all"ならロック済み以外の全行を対象にする
function handleGetAiCategorySuggestions(body) {
  try {
    const year = Number(body && body.year);
    const month = Number(body && body.month);
    const scope = (body && body.scope) || "uncategorized";
    const categoryFilter = Array.isArray(body && body.categoryFilter) ? body.categoryFilter : [];
    const institutionKeyword = ((body && body.institutionKeyword) || "").trim();
    const contentKeyword = ((body && body.contentKeyword) || "").trim();
    const amountMin = Number(body && body.amountMin) || 0;
    const amountMax = Number(body && body.amountMax) || 0;

    if (!year || !month) {
      return { success: false, error: "year and month are required" };
    }
    if (amountMin && amountMax && amountMin > amountMax) {
      return { success: false, error: "amountMin must not be greater than amountMax" };
    }

    const apiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
    if (!apiKey) {
      return { success: false, error: "GEMINI_API_KEY is not set in script properties" };
    }

    const sheet = getRawDataSheet();
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      return { success: true, suggestions: [], targetCount: 0 };
    }

    const data = sheet.getRange(2, 1, lastRow - 1, 13).getValues();
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);
    const tz = Session.getScriptTimeZone();

    const targets = [];
    for (const row of data) {
      const date = new Date(row[1]);
      if (date < start || date >= end) continue;
      if (row[12] === true) continue; // categoryLocked済みは提案対象外

      const category = row[5];
      const subcategory = row[6];
      if (scope === "uncategorized" && category !== "") continue;

      if (categoryFilter.length > 0) {
        const matchesCategory = categoryFilter.some(
          (f) => f.category === category && f.subcategory === subcategory,
        );
        if (!matchesCategory) continue;
      }
      if (institutionKeyword && String(row[4]).indexOf(institutionKeyword) === -1) continue;
      if (contentKeyword && String(row[2]).indexOf(contentKeyword) === -1) continue;
      if (amountMin || amountMax) {
        if (row[3] >= 0) continue; // 収入は絶対値フィルタ指定時は常に除外
        const absAmount = Math.abs(row[3]);
        if (amountMin && absAmount < amountMin) continue;
        if (amountMax && absAmount > amountMax) continue;
      }

      targets.push({
        id: row[0],
        date: Utilities.formatDate(date, tz, "yyyy/MM/dd"),
        content: row[2],
        amount: row[3],
        institution: row[4],
        currentCategory: category,
        currentSubcategory: subcategory,
      });
    }

    if (targets.length === 0) {
      return { success: true, suggestions: [], targetCount: 0 };
    }

    if (targets.length > MAX_AI_CATEGORY_TARGET_ROWS) {
      return {
        success: false,
        error: `対象件数が多すぎます（${MAX_AI_CATEGORY_TARGET_ROWS}件が上限です）。「未分類のみ」を選ぶか、月を分けて実行してください`,
      };
    }

    const { categories } = handleGetCategories();
    const categoryPairsText = buildCategoryPairsText_(categories);
    const existingPairKeys = new Set();
    Object.keys(categories).forEach((category) => {
      categories[category].forEach((subcategory) => {
        existingPairKeys.add(`${category} ${subcategory}`);
      });
    });
    const targetById = new Map(targets.map((t) => [t.id, t]));
    const suggestions = [];
    const logSheet = getAiLogSheet();

    for (let i = 0; i < targets.length; i += CATEGORY_SUGGESTION_BATCH_SIZE) {
      const batch = targets.slice(i, i + CATEGORY_SUGGESTION_BATCH_SIZE);
      const prompt = buildCategorySuggestionPrompt_(batch, categoryPairsText);
      const result = runGeminiChat_(
        apiKey,
        [{ role: "user", parts: [{ text: prompt }] }],
        CATEGORY_SUGGESTION_RESPONSE_SCHEMA,
      );

      if (!result.success) {
        return { success: false, error: result.error };
      }

      const batchSuggestions = Array.isArray(result.parsed.suggestions) ? result.parsed.suggestions : [];
      for (const s of batchSuggestions) {
        const target = targetById.get(s.id);
        if (!target) continue; // ハルシネーション対策: 対象行に存在しないidは無視

        suggestions.push({
          id: target.id,
          date: target.date,
          content: target.content,
          amount: target.amount,
          institution: target.institution,
          currentCategory: target.currentCategory,
          currentSubcategory: target.currentSubcategory,
          suggestedCategory: s.category,
          suggestedSubcategory: s.subcategory,
          isNewCategory: !existingPairKeys.has(`${s.category} ${s.subcategory}`),
          reason: s.reason,
        });
      }

      logSheet.appendRow([new Date().toISOString(), prompt, JSON.stringify(batchSuggestions)]);
    }

    return { success: true, suggestions, targetCount: targets.length };
  } catch (e) {
    Logger.log(`handleGetAiCategorySuggestions unexpected error: ${e.message}`);
    return { success: false, error: e.message };
  }
}
