import { useState } from "react";
import { useCategories } from "../hooks/useCategories";

export function CategorySettings() {
  const { status, pairs, errorMessage, mutateState, addCategory, updateCategoryPair, deleteCategoryPair, renameCategory, deleteCategory } =
    useCategories();
  const [newCategory, setNewCategory] = useState("");
  const [newSubcategory, setNewSubcategory] = useState("");
  const [confirmingKey, setConfirmingKey] = useState<string | null>(null);

  const [bulkOldCategory, setBulkOldCategory] = useState("");
  const [bulkNewCategory, setBulkNewCategory] = useState("");
  const [confirmingBulkDelete, setConfirmingBulkDelete] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const category = newCategory.trim();
    const subcategory = newSubcategory.trim();
    if (!category || !subcategory) return;

    const added = await addCategory({ category, subcategory });
    if (added) {
      setNewCategory("");
      setNewSubcategory("");
    }
  };

  const handleDeleteClick = (category: string, subcategory: string) => {
    const key = `${category}::${subcategory}`;
    if (confirmingKey === key) {
      setConfirmingKey(null);
      deleteCategoryPair({ category, subcategory });
    } else {
      setConfirmingKey(key);
    }
  };

  const handleBulkRename = async (e: React.FormEvent) => {
    e.preventDefault();
    const newCategory = bulkNewCategory.trim();
    if (!bulkOldCategory || !newCategory || bulkOldCategory === newCategory) return;

    const renamed = await renameCategory({ oldCategory: bulkOldCategory, newCategory });
    if (renamed) {
      setBulkOldCategory("");
      setBulkNewCategory("");
    }
  };

  const handleBulkDeleteClick = () => {
    if (!bulkOldCategory) return;
    if (confirmingBulkDelete) {
      setConfirmingBulkDelete(false);
      deleteCategory({ category: bulkOldCategory });
      setBulkOldCategory("");
    } else {
      setConfirmingBulkDelete(true);
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

  const categoryNames = Array.from(new Set(pairs.map((p) => p.category))).sort();

  return (
    <div className="flex flex-col gap-4" data-testid="category-settings">
      {pairs.length === 0 ? (
        <p className="text-base-content/70">登録されているカテゴリはありません</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {pairs.map(({ localId, category, subcategory }) => (
            <li key={localId} className="flex items-center gap-2">
              <input
                key={`${localId}-category-${category}`}
                aria-label={`${category}/${subcategory}の大項目`}
                defaultValue={category}
                onBlur={(e) => {
                  const value = e.target.value.trim();
                  if (value && value !== category) {
                    updateCategoryPair({
                      oldCategory: category,
                      oldSubcategory: subcategory,
                      newCategory: value,
                      newSubcategory: subcategory,
                    });
                  }
                }}
                className="input input-bordered input-sm w-28"
              />
              <input
                key={`${localId}-subcategory-${subcategory}`}
                aria-label={`${category}/${subcategory}の中項目`}
                defaultValue={subcategory}
                onBlur={(e) => {
                  const value = e.target.value.trim();
                  if (value && value !== subcategory) {
                    updateCategoryPair({
                      oldCategory: category,
                      oldSubcategory: subcategory,
                      newCategory: category,
                      newSubcategory: value,
                    });
                  }
                }}
                className="input input-bordered input-sm w-28"
              />
              {confirmingKey === `${category}::${subcategory}` ? (
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => handleDeleteClick(category, subcategory)}
                    className="btn btn-error btn-xs"
                  >
                    本当に削除
                  </button>
                  <button type="button" onClick={() => setConfirmingKey(null)} className="btn btn-xs">
                    キャンセル
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleDeleteClick(category, subcategory)}
                  className="btn btn-error btn-outline btn-xs"
                >
                  削除
                </button>
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
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="input input-bordered input-sm"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">中項目</span>
          <input
            aria-label="新しい中項目"
            value={newSubcategory}
            onChange={(e) => setNewSubcategory(e.target.value)}
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

      {categoryNames.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-base-content/10 pt-4">
          <h3 className="text-sm font-semibold">大項目の一括変更</h3>
          <p className="text-xs text-base-content/70">
            同じ大項目を持つ行をまとめてリネーム・削除します（予算の設定にも反映されます）
          </p>
          <form onSubmit={handleBulkRename} className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">対象の大項目</span>
              <select
                aria-label="一括変更する大項目"
                value={bulkOldCategory}
                onChange={(e) => {
                  setBulkOldCategory(e.target.value);
                  setConfirmingBulkDelete(false);
                }}
                className="select select-bordered select-sm"
              >
                <option value="">選択してください</option>
                {categoryNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">新しい大項目名</span>
              <input
                aria-label="一括変更後の大項目名"
                value={bulkNewCategory}
                onChange={(e) => setBulkNewCategory(e.target.value)}
                className="input input-bordered input-sm"
              />
            </label>
            <button
              type="submit"
              disabled={!bulkOldCategory || !bulkNewCategory.trim()}
              className="btn btn-sm"
            >
              一括リネーム
            </button>

            {confirmingBulkDelete ? (
              <div className="flex items-center gap-1">
                <span className="text-xs text-error">設定済みの予算も削除されます</span>
                <button type="button" onClick={handleBulkDeleteClick} className="btn btn-error btn-sm">
                  本当に削除
                </button>
                <button type="button" onClick={() => setConfirmingBulkDelete(false)} className="btn btn-sm">
                  キャンセル
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleBulkDeleteClick}
                disabled={!bulkOldCategory}
                className="btn btn-error btn-outline btn-sm"
              >
                大項目を一括削除
              </button>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
