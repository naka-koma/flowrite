import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const envPath = resolve(root, ".env");

function readEnv() {
  if (!existsSync(envPath)) return {};
  return Object.fromEntries(
    readFileSync(envPath, "utf8")
      .split("\n")
      .filter((line) => line.includes("=") && !line.startsWith("#"))
      .map((line) => line.split("=", 2))
  );
}

const { DEPLOYMENT_ID } = readEnv();

if (!DEPLOYMENT_ID) {
  console.error("DEPLOYMENT_ID が .env に設定されていません。先に npm run deploy を実行してください。");
  process.exit(1);
}

const url = `https://script.google.com/macros/s/${DEPLOYMENT_ID}/exec`;
console.log(`Opening: ${url}`);

const cmd = process.platform === "win32" ? `start "" "${url}"` : `open "${url}"`;
execSync(cmd);
