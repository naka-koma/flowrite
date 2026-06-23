import { execSync } from "node:child_process";
import { existsSync, rmSync, mkdirSync, readdirSync, copyFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const gasDir = resolve(root, "gas");
const buildDir = resolve(root, "build");

// 1. build/ をクリーンアップ
if (existsSync(buildDir)) {
  rmSync(buildDir, { recursive: true });
}
mkdirSync(buildDir, { recursive: true });

// 2. tsc + vite build（index.html を build/ に出力）
execSync("npx tsc && npx vite build", { stdio: "inherit", cwd: root });

// 3. gas/ のソースファイルを build/ にコピー（.js → .gs にリネーム）
const files = readdirSync(gasDir).filter(
  (f) => f.endsWith(".js") || f === "appsscript.json"
);
for (const file of files) {
  const destName = file.endsWith(".js") ? file.replace(/\.js$/, ".gs") : file;
  copyFileSync(resolve(gasDir, file), resolve(buildDir, destName));
  console.log(`  copied: gas/${file} -> build/${destName}`);
}

console.log("\nBuild complete. build/ is ready for clasp push.");
