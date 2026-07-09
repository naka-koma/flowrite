// doGet エントリーポイントのみ。API呼び出しは google.script.run 経由で
// csv.js / summary.js / gemini.js の各handle関数を直接呼び出す。

function doGet() {
  return HtmlService.createHtmlOutputFromFile("index")
    .setTitle("flowrite")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
