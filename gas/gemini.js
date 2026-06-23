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

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
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
  const json = JSON.parse(response.getContentText());

  if (response.getResponseCode() !== 200) {
    Logger.log(`Gemini API error: ${response.getContentText()}`);
    return { success: false, error: "Gemini API request failed" };
  }

  const advice = json.candidates[0].content.parts[0].text;

  const logSheet = getAiLogSheet();
  logSheet.appendRow([new Date().toISOString(), context, advice]);

  Logger.log("AI advice generated successfully");
  return { success: true, advice };
}
