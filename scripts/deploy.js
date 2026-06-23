import { execSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function run(cmd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: root });
}

function getOutput(cmd) {
  return execSync(cmd, { cwd: root, encoding: "utf8" }).trim();
}

// 1. ビルド
run("npm run build");

// 2. clasp push
run("clasp push --force");

// 3. 既存デプロイメントを探して更新、なければ新規作成
const output = getOutput("clasp deployments");
const lines = output.split("\n");
const existing = lines.find((line) => line.includes("- AKfycb") && !line.includes("@HEAD"));

if (existing) {
  const deployId = existing.match(/- (\S+)/)?.[1];
  console.log(`\nUpdating existing deployment: ${deployId}`);
  run(`clasp deploy -i ${deployId} -d "deploy"`);
} else {
  console.log("\nCreating new deployment...");
  run('clasp deploy -d "deploy"');
}
