function route(e, method) {
  const action = e.parameter.action;
  Logger.log(`${method} action=${action}`);

  try {
    let result;

    if (method === "GET") {
      switch (action) {
        case "summary":
          result = handleSummary(e.parameter);
          break;
        case "trend":
          result = handleTrend();
          break;
        default:
          result = { success: false, error: `Unknown GET action: ${action}` };
      }
    } else if (method === "POST") {
      const body = JSON.parse(e.postData.contents);
      switch (action) {
        case "upload":
          result = handleUpload(body);
          break;
        case "ai-advice":
          result = handleAiAdvice(body);
          break;
        default:
          result = { success: false, error: `Unknown POST action: ${action}` };
      }
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    Logger.log(`Error in route: ${err.message}`);
    const errorResult = { success: false, error: err.message };
    return ContentService.createTextOutput(JSON.stringify(errorResult))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
