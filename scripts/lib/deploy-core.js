import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

function run(cmd, root) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: root });
}

function getOutput(cmd, root) {
  return execSync(cmd, { cwd: root, encoding: "utf8" }).trim();
}

function readEnv(envPath) {
  if (!existsSync(envPath)) return {};
  const entries = readFileSync(envPath, "utf8")
    .split("\n")
    .filter((line) => line.includes("=") && !line.startsWith("#"));
  return Object.fromEntries(entries.map((line) => line.split("=", 2)));
}

function writeEnv(envPath, env) {
  const content =
    Object.entries(env)
      .map(([k, v]) => `${k}=${v}`)
      .join("\n") + "\n";
  writeFileSync(envPath, content);
}

// ビルド → clasp push → デプロイ（既存デプロイの更新、なければ新規作成）を行う。
// DEPLOYMENT_ID は .env → 環境変数 → 引数 の優先順で解決する。
// 新規作成した場合・解決したIDが.envと異なる場合は .env に書き戻す。
export function pushAndDeploy(root, { description = "deploy", deploymentId } = {}) {
  const envPath = resolve(root, ".env");

  run("npm run build", root);
  run("npx clasp push --force", root);

  const env = readEnv(envPath);
  let deployId = env.DEPLOYMENT_ID || process.env.DEPLOYMENT_ID || deploymentId;

  if (deployId) {
    console.log(`\nUpdating deployment: ${deployId}`);
    run(`npx clasp deploy -i ${deployId} -d "${description}"`, root);
  } else {
    console.log("\nNo DEPLOYMENT_ID found. Creating new webapp deployment...");
    const output = getOutput(`npx clasp deploy -d "${description}"`, root);
    const match = output.match(/Deployed (\S+)/);
    if (!match) {
      throw new Error("clasp deploy の出力からデプロイメントIDを取得できませんでした");
    }
    deployId = match[1];
  }

  if (env.DEPLOYMENT_ID !== deployId) {
    env.DEPLOYMENT_ID = deployId;
    writeEnv(envPath, env);
    console.log(`Saved DEPLOYMENT_ID to .env: ${deployId}`);
  }

  return deployId;
}
