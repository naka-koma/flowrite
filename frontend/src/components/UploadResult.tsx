import type { UploadResponse } from "../types/api";

interface UploadResultProps {
  result: UploadResponse | null;
  errorMessage: string | null;
}

export function UploadResult({ result, errorMessage }: UploadResultProps) {
  if (errorMessage) {
    return (
      <p role="alert" className="alert alert-error mt-3">
        エラー: {errorMessage}
      </p>
    );
  }

  if (!result) {
    return null;
  }

  return (
    <div className="mt-3 flex gap-4 text-sm">
      <p>
        追加件数: <span className="font-semibold">{result.inserted}</span>
      </p>
      <p>
        スキップ件数: <span className="font-semibold">{result.skipped}</span>
      </p>
    </div>
  );
}
