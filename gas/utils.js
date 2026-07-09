/**
 * スクリプトプロパティと接続状態を確認するユーティリティ。
 * GASエディタから手動実行して使う。
 */
function checkProperties() {
  const props = PropertiesService.getScriptProperties().getProperties();
  const required = ["GEMINI_API_KEY"];

  Logger.log("=== Script Properties ===");
  let allOk = true;

  for (const key of required) {
    if (props[key]) {
      Logger.log(`✓ ${key}: 設定済み`);
    } else {
      Logger.log(`✗ ${key}: 未設定`);
      allOk = false;
    }
  }

  Logger.log("\n=== Spreadsheet ===");
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    Logger.log(`✓ スプレッドシート接続OK: ${ss.getName()}`);
  } catch (e) {
    Logger.log(`✗ スプレッドシート接続エラー: ${e.message}`);
    allOk = false;
  }

  Logger.log(`\n=== 結果: ${allOk ? "OK" : "設定が不足しています"} ===`);
}
