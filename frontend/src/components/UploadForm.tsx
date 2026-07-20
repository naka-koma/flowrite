import { lazy, Suspense, useState } from "react";
import { useUpload } from "../hooks/useUpload";
import { UploadResult } from "./UploadResult";
import { SECTION_HEADING_CLASS } from "../lib/ui";

type UploadMode = "file" | "path";

// パス指定モードはローカル開発サーバー（scripts/vite-plugin-local-csv.js）でのみ動作するため、
// main.tsxのモック読み込みと同様にimport.meta.env.DEV判定つきの動的importで隔離し、
// 本番ビルド（GAS WebApp）のバンドルには一切含まれないようにする
const IS_DEV = import.meta.env.DEV;
const LocalCsvPathPanel = IS_DEV ? lazy(() => import("./LocalCsvPathPanel")) : null;

export function UploadForm() {
  const [mode, setMode] = useState<UploadMode>("file");
  const [files, setFiles] = useState<File[]>([]);
  const [overwriteCategory, setOverwriteCategory] = useState(true);
  const { status, results, upload } = useUpload();

  const handleSubmit = () => {
    if (files.length === 0) {
      return;
    }
    upload(files, overwriteCategory);
  };

  return (
    <div>
      <h2 className={SECTION_HEADING_CLASS}>CSVアップロード</h2>

      {IS_DEV && (
        <div role="tablist" className="tabs tabs-boxed mb-3 w-fit">
          <button
            type="button"
            role="tab"
            className={`tab ${mode === "file" ? "tab-active" : ""}`}
            onClick={() => setMode("file")}
          >
            ファイルを選択
          </button>
          <button
            type="button"
            role="tab"
            className={`tab ${mode === "path" ? "tab-active" : ""}`}
            onClick={() => setMode("path")}
          >
            パスで指定
          </button>
        </div>
      )}

      {mode === "path" && LocalCsvPathPanel ? (
        <Suspense fallback={<p className="text-sm text-base-content/70">読み込み中...</p>}>
          <LocalCsvPathPanel onFilesLoaded={setFiles} />
        </Suspense>
      ) : (
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <input
            type="file"
            accept=".csv"
            multiple
            aria-label="CSVファイル"
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            className="file-input file-input-bordered w-full sm:w-auto"
          />
        </div>
      )}

      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={handleSubmit}
          disabled={files.length === 0 || status === "loading"}
          className="btn btn-primary"
        >
          アップロード
        </button>
        {status === "loading" && <span className="loading loading-spinner loading-sm" />}
      </div>

      <label className="label mt-2 flex w-fit cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          aria-label="カテゴリ・メモをCSVの内容で上書きする"
          checked={overwriteCategory}
          onChange={(e) => setOverwriteCategory(e.target.checked)}
          className="checkbox checkbox-sm"
        />
        <span className="text-sm">カテゴリ・メモをCSVの内容で上書きする</span>
      </label>
      {status === "loading" && <p className="mt-2 text-sm text-base-content/70">アップロード中...</p>}
      <UploadResult results={results} />
    </div>
  );
}
