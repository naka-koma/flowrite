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
      <input
        type="file"
        accept=".csv"
        aria-label="CSVファイル"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      <button onClick={handleSubmit} disabled={!file || status === "loading"}>
        アップロード
      </button>
      {status === "loading" && <p>アップロード中...</p>}
      <UploadResult result={result} errorMessage={errorMessage} />
    </div>
  );
}
