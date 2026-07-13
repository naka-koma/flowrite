// GEMINI_MODEL未設定時に試すモデルの優先順位。無料枠のクォータが大きいものから並べる。
const GEMINI_MODEL_FALLBACK_ORDER = ["gemini-3.5-flash", "gemini-3.1-flash-lite"];

// フォールバック対象のHTTPステータス。429=クォータ超過、503=一時的な高負荷。
// どちらも別モデルへの切り替えやリトライで回復しうる一時的なエラー。
const GEMINI_RETRYABLE_STATUS_CODES = [429, 503];

function getGeminiModelsToTry() {
  const configuredModel = getAiModel() || PropertiesService.getScriptProperties().getProperty("GEMINI_MODEL");
  return configuredModel ? [configuredModel] : GEMINI_MODEL_FALLBACK_ORDER;
}

function callGeminiApi(model, apiKey, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
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

function handleAiAdvice(body) {
  try {
    const summary = handleSummary({ unit: body.unit, year: body.year, month: body.month });
    if (summary.error) {
      return { success: false, error: summary.error };
    }

    const context = buildAiContext_(summary);
    if (!context) {
      return { success: false, error: "指定した期間のデータがありません" };
    }

    const apiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
    if (!apiKey) {
      return { success: false, error: "GEMINI_API_KEY is not set in script properties" };
    }

    const prompt = `${getAiPrompt()}\n\n${context}`;

    for (const model of getGeminiModelsToTry()) {
      const { code, body: responseBody } = callGeminiApi(model, apiKey, prompt);

      if (code === 200) {
        const json = JSON.parse(responseBody);
        // safetyフィルタ等によりHTTP 200でもcandidatesが空/欠落する場合があるため、例外にせず明示的なエラーにする
        const advice = json.candidates && json.candidates[0] && json.candidates[0].content
          ? json.candidates[0].content.parts[0].text
          : null;

        if (!advice) {
          const blockReason = json.promptFeedback && json.promptFeedback.blockReason;
          Logger.log(`Gemini response has no candidates (model: ${model}): ${responseBody}`);
          return {
            success: false,
            error: blockReason
              ? `Geminiからの応答がブロックされました（理由: ${blockReason}）`
              : "Geminiからの応答に有効な候補がありません",
          };
        }

        const logSheet = getAiLogSheet();
        logSheet.appendRow([new Date().toISOString(), context, advice]);

        Logger.log(`AI advice generated successfully (model: ${model})`);
        return { success: true, advice };
      }

      Logger.log(`Gemini API error (model: ${model}): ${responseBody}`);

      if (!GEMINI_RETRYABLE_STATUS_CODES.includes(code)) {
        // 一時的なエラー以外はフォールバックせず即座に返す
        break;
      }
    }

    return { success: false, error: "Gemini API request failed" };
  } catch (e) {
    Logger.log(`handleAiAdvice unexpected error: ${e.message}`);
    return { success: false, error: e.message };
  }
}
