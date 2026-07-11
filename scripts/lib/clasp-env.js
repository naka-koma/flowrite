import { existsSync, writeFileSync, copyFileSync } from "node:fs";
import { resolve } from "node:path";

// clasp login 済みの認証情報がない環境（リモートセッション等）向けに、
// 環境変数から .clasprc.json / .clasp.json / gas/appsscript.json を復元する。
// ローカルでインタラクティブに clasp login 済みの場合は何もしない。

export function ensureClaspAuth() {
  const clasprcPath = resolve(process.env.USERPROFILE || process.env.HOME, ".clasprc.json");
  if (existsSync(clasprcPath)) {
    return;
  }
  if (process.env.CLASP_CREDENTIALS) {
    writeFileSync(clasprcPath, process.env.CLASP_CREDENTIALS);
    console.log("clasp: CLASP_CREDENTIALS から .clasprc.json を生成しました");
  }
}

export function ensureClaspProject(root) {
  const claspJsonPath = resolve(root, ".clasp.json");
  if (existsSync(claspJsonPath)) {
    return;
  }
  if (process.env.CLASP_SCRIPT_ID) {
    const claspJson = {
      scriptId: process.env.CLASP_SCRIPT_ID,
      scriptExtensions: [".js", ".gs"],
      htmlExtensions: [".html"],
      jsonExtensions: [".json"],
      filePushOrder: [],
      skipSubdirectories: false,
      rootDir: "build",
    };
    writeFileSync(claspJsonPath, JSON.stringify(claspJson, null, 2));
    console.log("clasp: CLASP_SCRIPT_ID から .clasp.json を生成しました");
  }
}

export function ensureAppsscriptJson(root) {
  const dest = resolve(root, "gas", "appsscript.json");
  if (!existsSync(dest)) {
    copyFileSync(resolve(root, "appsscript.template.json"), dest);
    console.log("gas/appsscript.json: appsscript.template.json から生成しました");
  }
}
