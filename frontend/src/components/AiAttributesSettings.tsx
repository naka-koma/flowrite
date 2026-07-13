import { useState } from "react";
import { useAiAttributes } from "../hooks/useAiAttributes";

export function AiAttributesSettings() {
  const { status, attributes, errorMessage, mutateState, upsertAttribute, deleteAttribute } = useAiAttributes();
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedKey = key.trim();
    const trimmedValue = value.trim();
    if (!trimmedKey || !trimmedValue) return;

    const saved = await upsertAttribute({ key: trimmedKey, value: trimmedValue });
    if (saved) {
      setKey("");
      setValue("");
    }
  };

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

  return (
    <div className="flex flex-col gap-4" data-testid="ai-attributes-settings">
      {attributes.length === 0 ? (
        <p className="text-base-content/70">登録されている属性情報はありません</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {attributes.map((attribute) => (
            <li key={attribute.key} className="flex items-center justify-between gap-2">
              <span>
                <span className="font-medium">{attribute.key}</span>
                <span className="text-base-content/70">: {attribute.value}</span>
              </span>
              <button
                type="button"
                onClick={() => deleteAttribute({ key: attribute.key })}
                disabled={mutateState.status === "loading"}
                className="btn btn-ghost btn-xs"
              >
                削除
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">項目名</span>
          <input
            aria-label="新しい項目名"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="例: ワークスタイル"
            className="input input-bordered input-sm"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">内容</span>
          <input
            aria-label="新しい内容"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="例: 在宅リモートワーク中心"
            className="input input-bordered input-sm"
          />
        </label>
        <button type="submit" disabled={mutateState.status === "loading"} className="btn btn-primary btn-sm">
          {mutateState.status === "loading" && <span className="loading loading-spinner loading-xs" />}
          追加
        </button>
      </form>

      {mutateState.status === "error" && (
        <p role="alert" className="alert alert-error">
          エラー: {mutateState.errorMessage}
        </p>
      )}
    </div>
  );
}
