import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ensureClaspAuth, ensureClaspProject, ensureAppsscriptJson } from "./lib/clasp-env.js";
import { pushAndDeploy } from "./lib/deploy-core.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// 認証情報・プロジェクト設定を環境変数から復元（未ログイン環境向け）
ensureClaspAuth();
ensureClaspProject(root);
ensureAppsscriptJson(root);

pushAndDeploy(root, { description: "deploy" });
