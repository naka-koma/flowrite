// ブラウザのlocalStorageはSafari WebApp化した場合のITP等の影響で正しく動かないことがあるため、
// テーマ・ホーム画面レイアウト・トレンド表示件数はUserProperties（Googleアカウント単位）に保存する
const USER_PREFERENCE_KEYS = ["theme", "dashboardLayout", "trendVisibleCount"];

function handleGetPreferences() {
  const props = PropertiesService.getUserProperties();
  const preferences = {};

  USER_PREFERENCE_KEYS.forEach(function (key) {
    preferences[key] = props.getProperty(key) || "";
  });

  return preferences;
}

function handleUpdatePreference(body) {
  const key = body.key;

  if (USER_PREFERENCE_KEYS.indexOf(key) === -1) {
    return { success: false, error: "invalid key" };
  }

  PropertiesService.getUserProperties().setProperty(key, String(body.value));
  return { success: true };
}
