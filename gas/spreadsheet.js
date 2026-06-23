function getSpreadsheet() {
  const id = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
  if (!id) {
    throw new Error("SPREADSHEET_ID is not set in script properties");
  }
  return SpreadsheetApp.openById(id);
}

function getRawDataSheet() {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName("raw_data");
  if (!sheet) {
    sheet = ss.insertSheet("raw_data");
    sheet.appendRow([
      "id", "date", "content", "amount", "institution",
      "category", "subcategory", "memo", "isTransfer", "isTarget", "importedAt"
    ]);
  }
  return sheet;
}

function getExistingIds(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return new Set();
  }
  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  return new Set(ids.map((row) => row[0]));
}

function appendRows(sheet, rows) {
  const values = rows.map((row) => [
    row.id, row.date, row.content, row.amount, row.institution,
    row.category, row.subcategory, row.memo, row.isTransfer, row.isTarget, row.importedAt,
  ]);
  const startRow = sheet.getLastRow() + 1;
  sheet.getRange(startRow, 1, values.length, values[0].length).setValues(values);
}

function getAiLogSheet() {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName("ai_log");
  if (!sheet) {
    sheet = ss.insertSheet("ai_log");
    sheet.appendRow(["timestamp", "context", "advice"]);
  }
  return sheet;
}
