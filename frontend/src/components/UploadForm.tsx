import { useState } from "react";
import { useUpload } from "../hooks/useUpload";
import { UploadResult } from "./UploadResult";
import { SECTION_HEADING_CLASS } from "../lib/ui";

export function UploadForm() {
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
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        <input
          type="file"
          accept=".csv"
          multiple
          aria-label="CSVファイル"
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          className="file-input file-input-bordered w-full sm:w-auto"
        />
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
