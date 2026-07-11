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

function handleAiAdvice(body) {
  const context = body.context;
  if (!context) {
    return { success: false, error: "context field is required" };
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
      const advice = json.candidates[0].content.parts[0].text;

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
}
