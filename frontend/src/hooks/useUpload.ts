import { useState } from "react";
import type { UploadResponse, FileUploadResult } from "../types/api";
import { runScript } from "../lib/googleScriptRun";

type UploadStatus = "idle" | "loading" | "success";

interface UploadState {
  status: UploadStatus;
  results: FileUploadResult[];
}

// 1ファイルあたりのアップロード可能な最大データ行数（ヘッダー行を除く）。
// 極端に大きいCSVは取込処理の比較コストが増えるため、フロント側で分割を促す
const MAX_CSV_ROWS = 5000;

// Shift-JISでも改行コード（CRLF/LF）はASCII範囲のバイト値と一致するため、
// デコードせずバイト列のまま改行数を数えてデータ行数を見積もる
async function countDataRows(file: File): Promise<number> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  if (bytes.length === 0) {
    return 0;
  }

  let lineBreaks = 0;
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] === 0x0a) {
      lineBreaks++;
    }
  }

  const hasTrailingNewline = bytes[bytes.length - 1] === 0x0a;
  const totalLines = lineBreaks + (hasTrailingNewline ? 0 : 1);
  return Math.max(0, totalLines - 1); // ヘッダー行を除く
}

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      // "data:<mime>;base64,<data>" の先頭部分を取り除く
      const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function uploadOne(file: File): Promise<FileUploadResult> {
  try {
    const rowCount = await countDataRows(file);
    if (rowCount > MAX_CSV_ROWS) {
      return {
        fileName: file.name,
        success: false,
        inserted: 0,
        skipped: 0,
        error: `1ファイルあたりの上限（${MAX_CSV_ROWS}行）を超えています。期間を分けて再度アップロードしてください。`,
      };
    }

    const csv = await readAsBase64(file);
    const data = await runScript<UploadResponse>("handleUpload", { csv });

    if (!data.success) {
      return {
        fileName: file.name,
        success: false,
        inserted: 0,
        skipped: 0,
        error: data.error ?? "アップロードに失敗しました",
      };
    }

    return { fileName: file.name, success: true, inserted: data.inserted, skipped: data.skipped };
  } catch (error) {
    const message = error instanceof Error ? error.message : "アップロードに失敗しました";
    return { fileName: file.name, success: false, inserted: 0, skipped: 0, error: message };
  }
}

export function useUpload() {
  const [state, setState] = useState<UploadState>({ status: "idle", results: [] });

  const upload = async (files: File[]) => {
    if (files.length === 0) {
      return;
    }
    setState({ status: "loading", results: [] });

    // 同時書き込みによる重複判定の競合を避けるため、順次アップロードする
    const results: FileUploadResult[] = [];
    for (const file of files) {
      results.push(await uploadOne(file));
    }

    setState({ status: "success", results });
  };

  return { ...state, upload };
}
