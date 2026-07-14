import { execSync } from "node:child_process";
import { existsSync, rmSync, mkdirSync, readdirSync, copyFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readEnv, readCurrentVersion } from "./lib/version.js";

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

// 4. バージョン情報を埋め込んだGASファイルを生成する（gas/にはソースを置かず、build時にのみ生成する。
//    連番はデプロイ時（scripts/lib/deploy-core.jsのbumpVersion）のみ進み、ビルドのみでは進まない）
const version = readCurrentVersion(readEnv(resolve(root, ".env")));
writeFileSync(
  resolve(buildDir, "version.gs"),
  `// 自動生成ファイル（scripts/build.jsが生成する。gas/に対応するソースはなく、手動編集しないこと）\nfunction handleGetVersion() {\n  return { version: "${version}" };\n}\n`,
);
console.log(`  generated: build/version.gs (${version})`);

console.log("\nBuild complete. build/ is ready for clasp push.");
