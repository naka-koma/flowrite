import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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

// 1. ビルド
run("npm run build");

// 2. clasp push
run("clasp push --force");

// 3. デプロイ
const env = readEnv();
let deployId = env.DEPLOYMENT_ID;

if (deployId) {
  console.log(`\nUpdating deployment from .env: ${deployId}`);
  run(`clasp deploy -i ${deployId} -d "deploy"`);
} else {
  console.log("\nNo DEPLOYMENT_ID in .env. Creating new webapp deployment...");
  const output = getOutput('clasp deploy -d "deploy"');
  const match = output.match(/Deployed (\S+)/);
  if (match) {
    deployId = match[1];
    saveDeploymentId(deployId);
  }
}
