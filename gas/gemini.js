// GEMINI_MODEL未設定時に試すモデルの優先順位。無料枠のクォータが大きいものから並べる。
const GEMINI_MODEL_FALLBACK_ORDER = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-3-flash",
  "gemini-2.0-flash",
];

function getGeminiModelsToTry() {
  const configuredModel = PropertiesService.getScriptProperties().getProperty("GEMINI_MODEL");
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

  const prompt = `あなたは家計管理のアドバイザーです。以下の支出データを分析し、具体的で実行可能なアドバイスを日本語で提供してください。\n\n${context}`;

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

    if (code !== 429) {
      // クォータ超過以外のエラーはフォールバックせず即座に返す
      break;
    }
  }

  return { success: false, error: "Gemini API request failed" };
}
