// doGet / doPost エントリーポイントのみ。ロジックは routes.js に委譲する。

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || null;

  if (action) {
    return route(e, "GET");
  }

  return HtmlService.createHtmlOutputFromFile("index")
    .setTitle("flowrite")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  return route(e, "POST");
}
