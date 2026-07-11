import { execSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ensureAppsscriptJson } from "./lib/clasp-env.js";
import { pushAndDeploy } from "./lib/deploy-core.js";

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
    // GUIブラウザを自動起動できない環境（リモートセッション等）では
    // CLASP_LOGIN_NO_LOCALHOST=1 を指定する。
    // 認可URLが表示されるので、ブラウザで開いて許可した後、
    // リダイレクト先（localhostに接続できないエラーページ）のURL全体を
    // アドレスバーからコピーしてターミナルに貼り付ける。
    if (process.env.CLASP_LOGIN_NO_LOCALHOST) {
      run("npx clasp login --no-localhost");
    } else {
      console.log(
        "GUIブラウザがない環境の場合は `CLASP_LOGIN_NO_LOCALHOST=1 npm run setup` を使ってください。",
      );
      run("npx clasp login");
    }
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

  // 既存のデプロイメントIDがあれば再利用する（なければ新規作成）
  const envPath = resolve(root, ".env");
  const envDeploymentIdMatch =
    existsSync(envPath) && readFileSync(envPath, "utf8").match(/^DEPLOYMENT_ID=(.+)$/m);
  const hasDeploymentId = Boolean(process.env.DEPLOYMENT_ID || envDeploymentIdMatch);

  let deploymentId;
  if (!hasDeploymentId) {
    const answer = await rl.question(
      "\n既存のWebAppデプロイメントIDがあれば入力してください（なければ空欄でEnter → 新規作成）\nDeployment ID: ",
    );
    deploymentId = answer || undefined;
  }

  // build + clasp push + clasp deploy
  console.log("\n=== build & deploy ===");
  pushAndDeploy(root, { description: "initial deployment", deploymentId });

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
