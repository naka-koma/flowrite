import { useState } from "react";
import { useLocalCsvLoader } from "../hooks/useLocalCsvLoader";

interface LocalCsvPathPanelProps {
  onFilesLoaded: (files: File[]) => void;
}

// npm run dev のローカル開発サーバー限定のパネル。UploadForm.tsx から
// import.meta.env.DEV 判定つきの React.lazy 経由でのみ読み込まれ、本番ビルドには含まれない
export default function LocalCsvPathPanel({ onFilesLoaded }: LocalCsvPathPanelProps) {
  const [pathsText, setPathsText] = useState("");
  const [loadedCount, setLoadedCount] = useState(0);
  const localCsv = useLocalCsvLoader();

  const handleLoad = async () => {
    const paths = pathsText
      .split("\n")
      .map((p) => p.trim())
      .filter(Boolean);
    if (paths.length === 0) {
      return;
    }

    const loaded = await localCsv.loadFromPaths(paths);
    setLoadedCount(loaded.length);
    if (loaded.length > 0) {
      onFilesLoaded(loaded);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <textarea
        aria-label="CSVファイルのパス"
        value={pathsText}
        onChange={(e) => setPathsText(e.target.value)}
        placeholder={"1行に1パス（絶対パス）\n例: C:\\Users\\...\\moneyforward.csv"}
        rows={3}
        className="textarea textarea-bordered w-full font-mono text-sm"
      />
      <button
        type="button"
        onClick={handleLoad}
        disabled={pathsText.trim() === "" || localCsv.status === "loading"}
        className="btn btn-outline btn-sm w-fit"
      >
        {localCsv.status === "loading" && <span className="loading loading-spinner loading-xs" />}
        読み込む
      </button>
      {loadedCount > 0 && <p className="text-sm text-base-content/70">{loadedCount}件のファイルを読み込みました</p>}
      {localCsv.errors.length > 0 && (
        <ul className="text-sm text-error">
          {localCsv.errors.map((e) => (
            <li key={e.path}>
              {e.path}: {e.error}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
