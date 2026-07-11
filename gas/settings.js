const DEFAULT_AI_PROMPT =
  "あなたは家計管理のアドバイザーです。以下の支出データを分析し、具体的で実行可能なアドバイスを日本語で提供してください。";

function getSettingsSheet() {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName("settings");
  if (!sheet) {
    sheet = ss.insertSheet("settings");
    sheet.appendRow(["key", "value"]);
  }
  return sheet;
}

function getSettingsMap_() {
  const sheet = getSettingsSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return {};
  }

  const values = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
  const map = {};
  values.forEach(function (row) {
    if (row[0]) {
      map[row[0]] = row[1];
    }
  });
  return map;
}

function setSetting_(key, value) {
  const sheet = getSettingsSheet();
  const lastRow = sheet.getLastRow();

  if (lastRow > 1) {
    const keys = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < keys.length; i++) {
      if (keys[i][0] === key) {
        sheet.getRange(i + 2, 2).setValue(value);
        return;
      }
    }
  }

  sheet.appendRow([key, value]);
}

// 未設定（空文字）の場合はデフォルトのプロンプトを使う
function getAiPrompt() {
  const map = getSettingsMap_();
  return map.prompt || DEFAULT_AI_PROMPT;
}

// 未設定（空文字）の場合はGEMINI_MODEL_FALLBACK_ORDERによる自動フォールバックを使う
function getAiModel() {
  const map = getSettingsMap_();
  return map.model || "";
}

function handleGetSettings() {
  return { prompt: getAiPrompt(), model: getAiModel() };
}

function handleUpdateSettings(settings) {
  if (typeof settings.prompt === "string") {
    setSetting_("prompt", settings.prompt.trim());
  }
  if (typeof settings.model === "string") {
    setSetting_("model", settings.model.trim());
  }
  return { success: true };
}
