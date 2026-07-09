// doGet / doPost エントリーポイントのみ。ロジックは routes.js に委譲する。

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || null;

  if (action) {
    return route(e, "GET");
  }

  const html = HtmlService.createHtmlOutputFromFile("index");
  const baseUrlScript = `<script>window.__FLOWRITE_BASE_URL__=${JSON.stringify(ScriptApp.getService().getUrl())};</script>`;
  const content = html.getContent().replace("<head>", `<head>${baseUrlScript}`);

  return HtmlService.createHtmlOutput(content)
    .setTitle("flowrite")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  return route(e, "POST");
}
