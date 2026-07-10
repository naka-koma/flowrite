import { useState } from "react";
import { useUpload } from "../hooks/useUpload";
import { UploadResult } from "./UploadResult";

export function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const { status, result, errorMessage, upload } = useUpload();

  const handleSubmit = () => {
    if (!file) {
      return;
    }
    upload(file);
  };

  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold">CSVアップロード</h2>
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="file"
          accept=".csv"
          aria-label="CSVファイル"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="file-input file-input-bordered"
        />
        <button
          onClick={handleSubmit}
          disabled={!file || status === "loading"}
          className="btn btn-primary"
        >
          アップロード
        </button>
        {status === "loading" && <span className="loading loading-spinner loading-sm" />}
      </div>
      {status === "loading" && <p className="mt-2 text-sm text-base-content/70">アップロード中...</p>}
      <UploadResult result={result} errorMessage={errorMessage} />
    </div>
  );
}
