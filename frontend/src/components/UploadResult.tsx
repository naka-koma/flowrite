import type { UploadResponse } from "../types/api";

interface UploadResultProps {
  result: UploadResponse | null;
  errorMessage: string | null;
}

export function UploadResult({ result, errorMessage }: UploadResultProps) {
  if (errorMessage) {
    return <p role="alert">エラー: {errorMessage}</p>;
  }

  if (!result) {
    return null;
  }

  return (
    <div>
      <p>追加件数: {result.inserted}</p>
      <p>スキップ件数: {result.skipped}</p>
    </div>
  );
}
