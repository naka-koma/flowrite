// 新DB（db/schema.ts）へのデータ移行用に、全シートをJSONとして書き出す機能。
// Issue #223（#217のPhase 3）。移行が完了したら削除してよい使い捨てコード。
//
// スプレッドシートのカスタムメニュー「flowrite管理 > 全データエクスポート」から実行する。
// Web画面（google.script.run）からは呼ばない想定のため、handleXxx命名にはしていない。

// シート名 -> [エクスポートJSONのキー名, 列の並び順（gas/spreadsheet.jsの
// 各getXxxSheet()が実際に作成するヘッダーと同じ順序）]。
// ヘッダー行のセル値をそのまま読む実装だと、ヘッダーが空・表記ゆれ等の場合に
// 列を正しく特定できない（実際に categoryLocked 列のヘッダーが空になっており
// 該当列が一切エクスポートされない事例があった）ため、列の並びを決め打ちして読む
const SHEET_EXPORT_DEFS = [
  [
    "raw_data",
    "rawData",
    ["id", "date", "content", "amount", "institution", "category", "subcategory", "memo", "isTransfer", "isTarget", "importedAt", "updatedAt", "categoryLocked"],
  ],
  ["settings", "settings", ["key", "value"]],
  ["categories", "categories", ["category", "subcategory", "costType"]],
  ["budgets", "budgets", ["category", "monthlyBudget"]],
  ["ai_attributes", "aiAttributes", ["id", "key", "value"]],
  ["ai_memory", "aiMemory", ["id", "type", "content", "category", "subcategory", "createdAt"]],
  ["decisions", "decisions", ["id", "changedAt", "source", "type", "target", "beforeAmount", "afterAmount", "reason"]],
  ["goals", "goals", ["key", "value"]],
  [
    "ai_chat_session",
    "aiChatSession",
    ["updatedAt", "messagesJson", "historyJson", "quickRepliesJson", "isFinal", "todoActionsJson", "categorySuggestionsJson"],
  ],
];

// 1シート分を、決め打ちの列定義に沿ってオブジェクト配列へ変換する（ヘッダー行は無視する）
function sheetToObjects_(sheet, columns) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  const rows = sheet.getRange(2, 1, lastRow - 1, columns.length).getValues();

  return rows.map((row) => {
    const obj = {};
    columns.forEach((key, i) => {
      obj[key] = row[i];
    });
    return obj;
  });
}

function exportAllDataAsObject_() {
  const ss = getSpreadsheet();

  const result = {};
  SHEET_EXPORT_DEFS.forEach(([sheetName, jsonKey, columns]) => {
    const sheet = ss.getSheetByName(sheetName);
    result[jsonKey] = sheet ? sheetToObjects_(sheet, columns) : [];
  });

  return result;
}

// JSONをGoogle Driveにファイルとして保存し、ダウンロードリンクをダイアログに表示する。
// GAS（スプレッドシート側）にはブラウザへ直接ファイルをダウンロードさせる手段がないため、
// 同じGoogleアカウント内で完結するDrive経由の方式を採る
function exportAllDataFromMenu() {
  const ui = SpreadsheetApp.getUi();
  const data = exportAllDataAsObject_();
  const json = JSON.stringify(data, null, 2);

  const fileName = `flowrite-export_${Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd_HHmmss")}.json`;
  const blob = Utilities.newBlob(json, "application/json", fileName);
  const file = DriveApp.createFile(blob);
  const downloadUrl = `https://drive.google.com/uc?export=download&id=${file.getId()}`;

  const counts = Object.keys(data)
    .map((key) => `<li>${key}: ${data[key].length}件</li>`)
    .join("");

  const html = HtmlService.createHtmlOutput(
    `<div style="font-family: sans-serif; font-size: 13px;">
      <p>Google Driveに書き出しました。</p>
      <ul>${counts}</ul>
      <p><a href="${downloadUrl}" target="_blank">${fileName} をダウンロード</a></p>
      <p>ダウンロード後、db/migrate-from-sheets/ の移行スクリプトの入力として使用してください。<br>
      確認後、Driveのファイルは削除して構いません（削除しても移行済みデータには影響しません）。</p>
    </div>`,
  )
    .setWidth(420)
    .setHeight(260);
  ui.showModalDialog(html, "全データエクスポート完了");
}
