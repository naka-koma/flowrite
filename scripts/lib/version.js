import { existsSync, readFileSync, writeFileSync } from "node:fs";

// .envに保存するバージョン管理用のキー（DEPLOYMENT_IDと同様、マシンローカルな状態としてgitignore対象の.envに持たせる）
const VERSION_DATE_KEY = "VERSION_DATE";
const VERSION_SEQ_KEY = "VERSION_SEQ";

export function readEnv(envPath) {
  if (!existsSync(envPath)) return {};
  const entries = readFileSync(envPath, "utf8")
    .split("\n")
    .filter((line) => line.includes("=") && !line.startsWith("#"));
  return Object.fromEntries(entries.map((line) => line.split("=", 2)));
}

export function writeEnv(envPath, env) {
  const content =
    Object.entries(env)
      .map(([k, v]) => `${k}=${v}`)
      .join("\n") + "\n";
  writeFileSync(envPath, content);
}

function todayDateString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

// デプロイのたびに呼び出す。同日中は連番をインクリメントし、日付が変わったら1にリセットする。
// envオブジェクトを直接書き換える（呼び出し側で永続化すること）
export function bumpVersion(env) {
  const today = todayDateString();
  const seq = env[VERSION_DATE_KEY] === today ? Number(env[VERSION_SEQ_KEY] || 0) + 1 : 1;
  env[VERSION_DATE_KEY] = today;
  env[VERSION_SEQ_KEY] = String(seq);
  return `v${today}.${seq}`;
}

// ビルド時に現在の（直近デプロイ済みの）バージョンを読み取るだけの用途。連番は進めない
export function readCurrentVersion(env) {
  if (!env[VERSION_DATE_KEY] || !env[VERSION_SEQ_KEY]) {
    return "dev";
  }
  return `v${env[VERSION_DATE_KEY]}.${env[VERSION_SEQ_KEY]}`;
}
