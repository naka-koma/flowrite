import { execSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ensureAppsscriptJson } from "./lib/clasp-env.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function run(cmd, opts = {}) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: root, ...opts });
}

const rl = createInterface({ input: process.stdin, output: process.stdout });

async function main() {
  console.log("=== flowrite setup ===\n");

  // npm install（devDependencies の @google/clasp もここでインストールされる）
  if (!existsSync(resolve(root, "node_modules"))) {
    console.log("\n=== npm install ===");
    run("npm install");
  }

  // clasp login
  const clasprcPath = resolve(process.env.USERPROFILE || process.env.HOME, ".clasprc.json");
  if (existsSync(clasprcPath)) {
    console.log("clasp: already logged in (skip)");
  } else if (process.env.CLASP_CREDENTIALS) {
    writeFileSync(clasprcPath, process.env.CLASP_CREDENTIALS);
    console.log("clasp: CLASP_CREDENTIALS から .clasprc.json を生成しました");
  } else {
    console.log("\n=== clasp login ===");
    console.log(
      "ブラウザを開けない環境（リモートセッション等）の場合は `npx clasp login --no-localhost` を使ってください。",
    );
    run("npx clasp login");
  }

  // clasp project
  const claspJsonPath = resolve(root, ".clasp.json");
  if (existsSync(claspJsonPath)) {
    console.log("clasp: project already exists (skip)");
  } else {
    console.log(`
スプレッドシートにバインドされたスクリプトのIDを入力してください。

まだ作成していない場合:
  1. 使いたいGoogleスプレッドシートを開く
  2. 拡張機能 > Apps Script を開く
  3. プロジェクトの設定からScript IDをコピー
`);
    const scriptId = await rl.question("Script ID: ");

    if (!scriptId) {
      console.error("Script ID は必須です。スプレッドシートから Apps Script を作成してください。");
      process.exit(1);
    }

    const claspJson = {
      scriptId,
      scriptExtensions: [".js", ".gs"],
      htmlExtensions: [".html"],
      jsonExtensions: [".json"],
      filePushOrder: [],
      skipSubdirectories: false,
      rootDir: "build",
    };
    writeFileSync(claspJsonPath, JSON.stringify(claspJson, null, 2));
    console.log(`clasp: connected to existing project (${scriptId})`);
  }

  // appsscript.json
  console.log("\n=== appsscript.json ===");
  ensureAppsscriptJson(root);

  // build
  console.log("\n=== npm run build ===");
  run("npm run build");

  // clasp push
  console.log("\n=== clasp push ===");
  run("npx clasp push");

  // clasp deploy
  console.log("\n=== clasp deploy ===");
  run('npx clasp deploy --description "initial deployment"');

  // show instructions
  const claspJson = JSON.parse(readFileSync(claspJsonPath, "utf8"));
  const connectedScriptId = claspJson.scriptId;

  console.log(`
========================================
  Setup complete
========================================

Set script properties manually:

1. Open in browser:
   https://script.google.com/d/${connectedScriptId}/edit

2. Project Settings > Script Properties

   GEMINI_API_KEY : <your Gemini API key>

3. Run 'npm run deploy' to deploy

========================================`);

  rl.close();
}

main();
