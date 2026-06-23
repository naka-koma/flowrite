import { execSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { existsSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function run(cmd, opts = {}) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: root, ...opts });
}

function hasCommand(cmd) {
  try {
    execSync(`${cmd} --version`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

const rl = createInterface({ input: process.stdin, output: process.stdout });

async function main() {
  console.log("=== flowrite setup ===\n");

  // clasp check
  if (!hasCommand("clasp")) {
    console.error("ERROR: clasp is not installed");
    console.error("  npm install -g @google/clasp");
    process.exit(1);
  }

  // npm install
  if (!existsSync(resolve(root, "node_modules"))) {
    console.log("\n=== npm install ===");
    run("npm install");
  }

  // clasp login
  const clasprcPath = resolve(process.env.USERPROFILE || process.env.HOME, ".clasprc.json");
  if (existsSync(clasprcPath)) {
    console.log("clasp: already logged in (skip)");
  } else {
    console.log("\n=== clasp login ===");
    run("clasp login");
  }

  // clasp create
  const claspJsonPath = resolve(root, ".clasp.json");
  if (existsSync(claspJsonPath)) {
    console.log("clasp: project already exists (skip)");
  } else {
    console.log("\n=== clasp create ===");
    run("clasp create --title flowrite", { cwd: resolve(root, "gas") });

    const gasClaspJson = resolve(root, "gas", ".clasp.json");
    if (existsSync(gasClaspJson)) {
      const json = JSON.parse(readFileSync(gasClaspJson, "utf8"));
      json.rootDir = "gas";
      writeFileSync(claspJsonPath, JSON.stringify(json, null, 2));
      execSync(`del "${gasClaspJson}"`, { stdio: "ignore" });
    }
  }

  // appsscript.json
  console.log("\n=== appsscript.json ===");
  copyFileSync(
    resolve(root, "appsscript.template.json"),
    resolve(root, "gas", "appsscript.json"),
  );

  // spreadsheet ID
  const spreadsheetId = await rl.question("\nEnter SPREADSHEET_ID: ");

  // build
  console.log("\n=== npm run build ===");
  run("npm run build");

  // clasp push
  console.log("\n=== clasp push ===");
  run("clasp push");

  // clasp deploy
  console.log("\n=== clasp deploy ===");
  run('clasp deploy --description "initial deployment"');

  // show instructions
  const claspJson = JSON.parse(readFileSync(claspJsonPath, "utf8"));
  const scriptId = claspJson.scriptId;

  console.log(`
========================================
  Setup complete
========================================

Set script properties manually:

1. Open in browser:
   https://script.google.com/d/${scriptId}/edit

2. Project Settings > Script Properties

   SPREADSHEET_ID : ${spreadsheetId}
   GEMINI_API_KEY  : <your Gemini API key>

3. Run 'npm run deploy' to deploy

========================================`);

  rl.close();
}

main();
