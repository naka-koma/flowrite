import { useState } from "react";
import { useCategories } from "../hooks/useCategories";

export function CategorySettings() {
  const { status, categories, errorMessage, addState, addCategory, renameCategory, deleteCategory } =
    useCategories();
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmingCategory, setConfirmingCategory] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedCategory = category.trim();
    const trimmedSubcategory = subcategory.trim();
    if (!trimmedCategory || !trimmedSubcategory) return;

    const added = await addCategory({ category: trimmedCategory, subcategory: trimmedSubcategory });
    if (added) {
      setCategory("");
      setSubcategory("");
    }
  };

  const startRename = (name: string) => {
    setEditingCategory(name);
    setRenameValue(name);
  };

  const handleRenameSubmit = async (oldCategory: string, e: React.FormEvent) => {
    e.preventDefault();
    const newCategory = renameValue.trim();
    if (!newCategory || newCategory === oldCategory) {
      setEditingCategory(null);
      return;
    }

    const renamed = await renameCategory({ oldCategory, newCategory });
    if (renamed) {
      setEditingCategory(null);
    }
  };

  const handleDeleteClick = (name: string) => {
    if (confirmingCategory === name) {
      setConfirmingCategory(null);
      deleteCategory({ category: name });
    } else {
      setConfirmingCategory(name);
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

  const categoryNames = Object.keys(categories);

  return (
    <div className="flex flex-col gap-4" data-testid="category-settings">
      {categoryNames.length === 0 ? (
        <p className="text-base-content/70">登録されているカテゴリはありません</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {categoryNames.map((name) => (
            <li key={name} className="flex flex-wrap items-center gap-2">
              {editingCategory === name ? (
                <form onSubmit={(e) => handleRenameSubmit(name, e)} className="flex items-center gap-2">
                  <input
                    aria-label={`${name}の新しい大項目名`}
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    className="input input-bordered input-sm"
                    autoFocus
                  />
                  <button type="submit" disabled={addState.status === "loading"} className="btn btn-primary btn-xs">
                    保存
                  </button>
                  <button type="button" onClick={() => setEditingCategory(null)} className="btn btn-xs">
                    キャンセル
                  </button>
                </form>
              ) : (
                <>
                  <span className="font-medium">{name}</span>
                  <span className="text-base-content/70">: {(categories[name] ?? []).join("、")}</span>
                  <button type="button" onClick={() => startRename(name)} className="btn btn-ghost btn-xs">
                    編集
                  </button>
                  {confirmingCategory === name ? (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-error">設定済みの予算も削除されます</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(name)}
                        className="btn btn-error btn-xs"
                      >
                        本当に削除
                      </button>
                      <button type="button" onClick={() => setConfirmingCategory(null)} className="btn btn-xs">
                        キャンセル
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleDeleteClick(name)}
                      className="btn btn-error btn-outline btn-xs"
                    >
                      削除
                    </button>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">大項目</span>
          <input
            aria-label="新しい大項目"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="input input-bordered input-sm"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">中項目</span>
          <input
            aria-label="新しい中項目"
            value={subcategory}
            onChange={(e) => setSubcategory(e.target.value)}
            className="input input-bordered input-sm"
          />
        </label>
        <button type="submit" disabled={addState.status === "loading"} className="btn btn-primary btn-sm">
          {addState.status === "loading" && <span className="loading loading-spinner loading-xs" />}
          追加
        </button>
      </form>

      {addState.status === "error" && (
        <p role="alert" className="alert alert-error">
          エラー: {addState.errorMessage}
        </p>
      )}
    </div>
  );
}
