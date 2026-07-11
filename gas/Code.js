// doGet エントリーポイントのみ。API呼び出しは google.script.run 経由で
// csv.js / summary.js / gemini.js の各handle関数を直接呼び出す。

function doGet() {
  return HtmlService.createHtmlOutputFromFile("index")
    .setTitle("flowrite")
    // GAS WebAppは script.google.com 側のラッパーiframeで配信されるため、
    // index.html内の<meta viewport>だけではモバイルで正しく反映されない。
    // addMetaTagでラッパー側にビューポートを伝える。
    .addMetaTag("viewport", "width=device-width, initial-scale=1.0")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
