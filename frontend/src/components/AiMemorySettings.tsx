import { useState } from "react";
import { useAiMemories } from "../hooks/useAiMemories";
import type { AiMemory } from "../types/api";

function MemoryList({
  memories,
  confirmingId,
  onDeleteClick,
}: {
  memories: AiMemory[];
  confirmingId: string | null;
  onDeleteClick: (id: string) => void;
}) {
  if (memories.length === 0) {
    return <p className="text-base-content/70">まだ記憶はありません</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {memories.map((memory) => (
        <li key={memory.id} className="flex items-start justify-between gap-2 rounded-box border border-base-300 p-2">
          <div className="flex flex-col">
            {memory.type === "categoryPattern" ? (
              <p className="text-sm">
                {memory.content} → {memory.category}:{memory.subcategory}
              </p>
            ) : (
              <p className="whitespace-pre-wrap text-sm">{memory.content}</p>
            )}
          </div>
          {confirmingId === memory.id ? (
            <div className="flex shrink-0 gap-1">
              <button type="button" onClick={() => onDeleteClick(memory.id)} className="btn btn-error btn-xs">
                本当に削除
              </button>
              <button type="button" onClick={() => onDeleteClick("")} className="btn btn-xs">
                キャンセル
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onDeleteClick(memory.id)}
              className="btn btn-error btn-outline btn-xs shrink-0"
            >
              削除
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

export function AiMemorySettings() {
  const { status, memories, errorMessage, deleteMemory } = useAiMemories();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const handleDeleteClick = (id: string) => {
    if (!id) {
      setConfirmingId(null);
      return;
    }
    if (confirmingId === id) {
      setConfirmingId(null);
      deleteMemory({ id });
    } else {
      setConfirmingId(id);
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

  const insights = memories.filter((m) => m.type === "insight");
  const categoryPatterns = memories.filter((m) => m.type === "categoryPattern");

  return (
    <div className="flex flex-col gap-6" data-testid="ai-memory-settings">
      <div className="flex flex-col gap-2" data-testid="ai-memory-insights">
        <h3 className="text-sm font-medium">気づき・傾向</h3>
        <MemoryList memories={insights} confirmingId={confirmingId} onDeleteClick={handleDeleteClick} />
      </div>

      <div className="flex flex-col gap-2" data-testid="ai-memory-category-patterns">
        <h3 className="text-sm font-medium">分類パターン</h3>
        <MemoryList memories={categoryPatterns} confirmingId={confirmingId} onDeleteClick={handleDeleteClick} />
      </div>
    </div>
  );
}
