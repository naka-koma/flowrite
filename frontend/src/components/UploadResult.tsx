import type { FileUploadResult } from "../types/api";

interface UploadResultProps {
  results: FileUploadResult[];
}

export function UploadResult({ results }: UploadResultProps) {
  if (results.length === 0) {
    return null;
  }

  const succeeded = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);
  const totalInserted = succeeded.reduce((sum, r) => sum + r.inserted, 0);
  const totalSkipped = succeeded.reduce((sum, r) => sum + r.skipped, 0);

  return (
    <div className="mt-3">
      {succeeded.length > 0 && (
        <div className="flex gap-4 text-sm">
          <p>
            追加件数: <span className="font-semibold">{totalInserted}</span>
          </p>
          <p>
            スキップ件数: <span className="font-semibold">{totalSkipped}</span>
          </p>
        </div>
      )}

      {results.length > 1 && (
        <ul className="mt-2 text-sm">
          {results.map((r) => (
            <li key={r.fileName}>
              {r.fileName}:{" "}
              {r.success ? `追加${r.inserted}件・スキップ${r.skipped}件` : `エラー - ${r.error}`}
            </li>
          ))}
        </ul>
      )}

      {failed.map((r) => (
        <p key={r.fileName} role="alert" className="alert alert-error mt-2">
          エラー: {r.fileName} - {r.error}
        </p>
      ))}
    </div>
  );
}
