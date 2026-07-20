import { useState } from "react";

type LoaderStatus = "idle" | "loading";

interface PathError {
  path: string;
  error: string;
}

interface LocalCsvFileResult {
  path: string;
  name?: string;
  base64?: string;
  error?: string;
}

interface LocalCsvState {
  status: LoaderStatus;
  errors: PathError[];
}

function base64ToFile(base64: string, name: string): File {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], name, { type: "text/csv" });
}

// npm run dev のローカル開発サーバーが提供する /__local-csv （scripts/vite-plugin-local-csv.js）を
// 呼び出し、ローカルファイルシステム上のCSVをFileオブジェクトとして読み込む。
// このエンドポイントは本番のGAS WebAppには存在しないため、呼び出し側でimport.meta.env.DEVによりガードすること
export function useLocalCsvLoader() {
  const [state, setState] = useState<LocalCsvState>({ status: "idle", errors: [] });

  const loadFromPaths = async (paths: string[]): Promise<File[]> => {
    setState({ status: "loading", errors: [] });

    try {
      const response = await fetch("/__local-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paths }),
      });
      const data = (await response.json()) as { files?: LocalCsvFileResult[]; error?: string };

      if (data.error) {
        setState({ status: "idle", errors: [{ path: "", error: data.error }] });
        return [];
      }

      const files: File[] = [];
      const errors: PathError[] = [];
      for (const item of data.files ?? []) {
        if (item.error) {
          errors.push({ path: item.path, error: item.error });
        } else if (item.base64 && item.name) {
          files.push(base64ToFile(item.base64, item.name));
        }
      }

      setState({ status: "idle", errors });
      return files;
    } catch (error) {
      const message = error instanceof Error ? error.message : "読み込みに失敗しました";
      setState({ status: "idle", errors: [{ path: "", error: message }] });
      return [];
    }
  };

  return { ...state, loadFromPaths };
}
