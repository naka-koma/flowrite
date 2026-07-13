import { useEffect, useState } from "react";
import { useSettings } from "../hooks/useSettings";

export function SettingsForm() {
  const { status, settings, errorMessage, saveState, saveSettings } = useSettings();
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (settings) {
      setPrompt(settings.prompt);
      setModel(settings.model);
      setNotes(settings.notes);
    }
  }, [settings]);

  if (status === "loading") {
    return (
      <p className="flex items-center gap-2">
        <span className="loading loading-spinner loading-sm" />
        読み込み中...
      </p>
    );
  }

  if (status === "error") {
    return (
      <p role="alert" className="alert alert-error">
        エラー: {errorMessage}
      </p>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveSettings({ prompt, model, notes });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">プロンプト</span>
        <textarea
          aria-label="プロンプト"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          className="textarea textarea-bordered"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">使用モデル（未指定時は自動フォールバック）</span>
        <input
          aria-label="使用モデル"
          type="text"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder="例: gemini-3.5-flash"
          className="input input-bordered"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">現在の取り組み・解決済みの事項</span>
        <textarea
          aria-label="現在の取り組み・解決済みの事項"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="例: 外食を減らす取り組みは既に開始している"
          className="textarea textarea-bordered"
        />
      </label>

      <div>
        <button type="submit" disabled={saveState.status === "loading"} className="btn btn-primary">
          {saveState.status === "loading" && <span className="loading loading-spinner loading-sm" />}
          保存
        </button>
      </div>

      {saveState.status === "success" && <p className="text-success">保存しました</p>}
      {saveState.status === "error" && (
        <p role="alert" className="alert alert-error">
          エラー: {saveState.errorMessage}
        </p>
      )}
    </form>
  );
}
