import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { basename, isAbsolute } from "node:path";

async function readOne(rawPath) {
  const path = typeof rawPath === "string" ? rawPath.trim() : "";

  if (!path) {
    return { path: rawPath, error: "パスを入力してください" };
  }
  if (!isAbsolute(path)) {
    return { path, error: "絶対パスを指定してください" };
  }
  if (!path.toLowerCase().endsWith(".csv")) {
    return { path, error: "CSVファイルのみ読み込めます" };
  }
  if (!existsSync(path)) {
    return { path, error: "ファイルが見つかりません" };
  }

  try {
    const buffer = await readFile(path);
    return { path, name: basename(path), base64: buffer.toString("base64") };
  } catch (e) {
    return { path, error: e instanceof Error ? e.message : "読み込みに失敗しました" };
  }
}

// テキスト入力（コピペ可能）からローカルのCSVパスを指定してアップロードできるよう、
// ローカル開発サーバー限定でパス指定読み込みを提供する。
// configureServerはvite build時には呼ばれないため、本番ビルドには一切含まれない
export function localCsvPlugin() {
  return {
    name: "local-csv-reader",
    configureServer(server) {
      server.middlewares.use("/__local-csv", (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: "Method Not Allowed" }));
          return;
        }

        let body = "";
        req.on("data", (chunk) => {
          body += chunk;
        });
        req.on("end", async () => {
          let paths;
          try {
            ({ paths } = JSON.parse(body));
          } catch {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: "リクエストの解析に失敗しました" }));
            return;
          }

          if (!Array.isArray(paths)) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: "paths must be an array" }));
            return;
          }

          const files = await Promise.all(paths.map(readOne));
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ files }));
        });
      });
    },
  };
}
