import { useRef, useState } from "react";
import { useUpload } from "../hooks/useUpload";
import { UploadResult } from "./UploadResult";
import { SECTION_HEADING_CLASS } from "../lib/ui";
import { collectDroppedCsvFiles, toCsvFiles } from "../lib/csvFiles";

// webkitdirectoryはTypeScriptの標準の型定義に含まれないため、属性として渡すために型を緩める
const DIRECTORY_ATTRS = { webkitdirectory: "", directory: "" } as React.InputHTMLAttributes<HTMLInputElement>;

export function UploadForm() {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [overwriteCategory, setOverwriteCategory] = useState(true);
  const { status, results, upload } = useUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const directoryInputRef = useRef<HTMLInputElement>(null);

  // 入手経路がファイル選択・フォルダ選択・ドロップのどれであっても、
  // ここでFile配列に揃えてしまえば以降の処理は共通でよい
  const addFiles = (added: File[]) => {
    setFiles((current) => toCsvFiles([...current, ...added]));
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(await collectDroppedCsvFiles(e.dataTransfer));
  };

  const handleSubmit = () => {
    if (files.length === 0) {
      return;
    }
    upload(files, overwriteCategory);
  };

  const clearFiles = () => {
    setFiles([]);
    // 同じファイルを選び直せるよう、input側の選択状態もリセットする
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (directoryInputRef.current) directoryInputRef.current.value = "";
  };

  return (
    <div>
      <h2 className={SECTION_HEADING_CLASS}>CSVアップロード</h2>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        data-testid="csv-drop-zone"
        className={`flex flex-col items-center gap-3 rounded-box border-2 border-dashed p-6 transition-colors ${
          isDragging ? "border-primary bg-primary/5" : "border-base-300"
        }`}
      >
        <p className="text-sm text-base-content/70">CSVファイルやフォルダをここにドラッグ&ドロップ</p>

        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" onClick={() => fileInputRef.current?.click()} className="btn btn-outline btn-sm">
            ファイルを選択
          </button>
          <button type="button" onClick={() => directoryInputRef.current?.click()} className="btn btn-outline btn-sm">
            フォルダを選択
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          multiple
          aria-label="CSVファイル"
          onChange={(e) => addFiles(Array.from(e.target.files ?? []))}
          className="hidden"
        />
        <input
          ref={directoryInputRef}
          type="file"
          aria-label="CSVフォルダ"
          onChange={(e) => addFiles(Array.from(e.target.files ?? []))}
          className="hidden"
          {...DIRECTORY_ATTRS}
        />
      </div>

      {files.length > 0 && (
        <div className="mt-3" data-testid="selected-csv-files">
          <div className="mb-1 flex items-center gap-2">
            <p className="text-sm font-medium">選択中: {files.length}件</p>
            <button type="button" onClick={clearFiles} className="btn btn-ghost btn-xs">
              クリア
            </button>
          </div>
          <ul className="max-h-40 overflow-y-auto text-sm text-base-content/70">
            {files.map((file) => (
              <li key={`${file.name}:${file.size}`} className="font-mono">
                {file.name}
              </li>
            ))}
          </ul>
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
