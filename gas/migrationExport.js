// 新DB（db/schema.ts）へのデータ移行用に、全シートをJSONとして書き出す機能。
// Issue #223（#217のPhase 3）。移行が完了したら削除してよい使い捨てコード。
//
// スプレッドシートのカスタムメニュー「flowrite管理 > 全データエクスポート」から実行する。
// Web画面（google.script.run）からは呼ばない想定のため、handleXxx命名にはしていない。

// 1シート分をヘッダー行をキーにしたオブジェクト配列へ変換する
function sheetToObjects_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  const lastCol = sheet.getLastColumn();
  const [header, ...rows] = sheet.getRange(1, 1, lastRow, lastCol).getValues();

  return rows.map((row) => {
    const obj = {};
    header.forEach((key, i) => {
      obj[key] = row[i];
    });
    return obj;
  });
}

function exportAllDataAsObject_() {
  const ss = getSpreadsheet();

  // シート名 -> エクスポートJSONのキー名（db/schema.tsのテーブル名に合わせる）
  const sheetKeyMap = {
    raw_data: "rawData",
    settings: "settings",
    categories: "categories",
    budgets: "budgets",
    ai_attributes: "aiAttributes",
    ai_memory: "aiMemory",
    decisions: "decisions",
    goals: "goals",
    ai_chat_session: "aiChatSession",
  };

  const result = {};
  Object.keys(sheetKeyMap).forEach((sheetName) => {
    const sheet = ss.getSheetByName(sheetName);
    result[sheetKeyMap[sheetName]] = sheet ? sheetToObjects_(sheet) : [];
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
