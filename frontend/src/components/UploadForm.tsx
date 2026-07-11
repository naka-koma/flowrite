import { useState } from "react";
import { useUpload } from "../hooks/useUpload";
import { UploadResult } from "./UploadResult";
import { SECTION_HEADING_CLASS } from "../lib/ui";

export function UploadForm() {
  const [files, setFiles] = useState<File[]>([]);
  const { status, results, upload } = useUpload();

  const handleSubmit = () => {
    if (files.length === 0) {
      return;
    }
    upload(files);
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
      {status === "loading" && <p className="mt-2 text-sm text-base-content/70">アップロード中...</p>}
      <UploadResult results={results} />
    </div>
  );
}
