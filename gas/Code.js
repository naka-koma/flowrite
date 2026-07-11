// doGet エントリーポイントのみ。API呼び出しは google.script.run 経由で
// csv.js / summary.js / gemini.js の各handle関数を直接呼び出す。

// favicon（32x32 PNG）。setFaviconUrlはdata URIを受け付けないため、
// 本リポジトリ（public）のraw.githubusercontent.com経由で実際にホスティングする。
const FAVICON_URL =
  "https://raw.githubusercontent.com/naka-koma/flowrite/main/frontend/src/assets/favicon-32.png";

function doGet() {
  return HtmlService.createHtmlOutputFromFile("index")
    .setTitle("flowrite")
    .setFaviconUrl(FAVICON_URL)
    // GAS WebAppは script.google.com 側のラッパーiframeで配信されるため、
    // index.html内の<meta viewport>だけではモバイルで正しく反映されない。
    // addMetaTagでラッパー側にビューポートを伝える。
    .addMetaTag("viewport", "width=device-width, initial-scale=1.0")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
