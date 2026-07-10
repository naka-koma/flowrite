import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ensureClaspAuth, ensureClaspProject, ensureAppsscriptJson } from "./lib/clasp-env.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const envPath = resolve(root, ".env");

function run(cmd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: root });
}

function getOutput(cmd) {
  return execSync(cmd, { cwd: root, encoding: "utf8" }).trim();
}

function readEnv() {
  if (!existsSync(envPath)) return {};
  const entries = readFileSync(envPath, "utf8")
    .split("\n")
    .filter((line) => line.includes("=") && !line.startsWith("#"));
  return Object.fromEntries(entries.map((line) => line.split("=", 2)));
}

function writeEnv(env) {
  const content = Object.entries(env)
    .map(([k, v]) => `${k}=${v}`)
    .join("\n") + "\n";
  writeFileSync(envPath, content);
}

function saveDeploymentId(id) {
  const env = readEnv();
  env.DEPLOYMENT_ID = id;
  writeEnv(env);
  console.log(`Saved DEPLOYMENT_ID to .env`);
}

// 0. 認証情報・プロジェクト設定を環境変数から復元（未ログイン環境向け）
ensureClaspAuth();
ensureClaspProject(root);
ensureAppsscriptJson(root);

// 1. ビルド
run("npm run build");

// 2. clasp push
run("npx clasp push --force");

// 3. デプロイ
const env = readEnv();
let deployId = env.DEPLOYMENT_ID || process.env.DEPLOYMENT_ID;

if (deployId) {
  console.log(`\nUpdating deployment: ${deployId}`);
  run(`npx clasp deploy -i ${deployId} -d "deploy"`);
  if (!env.DEPLOYMENT_ID) {
    saveDeploymentId(deployId);
  }
} else {
  console.log("\nNo DEPLOYMENT_ID found. Creating new webapp deployment...");
  const output = getOutput('npx clasp deploy -d "deploy"');
  const match = output.match(/Deployed (\S+)/);
  if (match) {
    deployId = match[1];
    saveDeploymentId(deployId);
  }
}
