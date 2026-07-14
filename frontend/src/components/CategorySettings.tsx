import { useMemo, useState } from "react";
import { useCategories, type CategoryPairRow } from "../hooks/useCategories";
import { SECTION_HEADING_CLASS } from "../lib/ui";

export function CategorySettings() {
  const {
    status,
    pairs,
    errorMessage,
    mutateState,
    addCategory,
    updateCategoryPair,
    deleteCategoryPair,
    renameCategory,
    deleteCategory,
  } = useCategories();
  const [newCategory, setNewCategory] = useState("");
  const [newSubcategory, setNewSubcategory] = useState("");
  const [confirmingKey, setConfirmingKey] = useState<string | null>(null);

  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmingCategoryDelete, setConfirmingCategoryDelete] = useState<string | null>(null);

  const groups = useMemo(() => {
    const map = new Map<string, CategoryPairRow[]>();
    for (const pair of pairs) {
      if (!map.has(pair.category)) {
        map.set(pair.category, []);
      }
      map.get(pair.category)!.push(pair);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], "ja"));
  }, [pairs]);

  const isOpen = (category: string) => openCategories.has(category) || !openCategories.has(`__closed__${category}`);

  const toggleOpen = (category: string) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      const closedKey = `__closed__${category}`;
      if (next.has(closedKey)) {
        next.delete(closedKey);
      } else {
        next.add(closedKey);
      }
      return next;
    });
  };

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

  const startRename = (category: string) => {
    setEditingCategory(category);
    setRenameValue(category);
  };

  const handleRenameSubmit = async (oldCategory: string, e: React.FormEvent) => {
    e.preventDefault();
    const newCategoryName = renameValue.trim();
    if (!newCategoryName || newCategoryName === oldCategory) {
      setEditingCategory(null);
      return;
    }

    const renamed = await renameCategory({ oldCategory, newCategory: newCategoryName });
    if (renamed) {
      setEditingCategory(null);
    }
  };

  const handleCategoryDeleteClick = (category: string) => {
    if (confirmingCategoryDelete === category) {
      setConfirmingCategoryDelete(null);
      deleteCategory({ category });
    } else {
      setConfirmingCategoryDelete(category);
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
    <div className="flex flex-col gap-4" data-testid="category-settings">
      {groups.length === 0 ? (
        <p className="text-base-content/70">登録されているカテゴリはありません</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {groups.map(([category, categoryPairs]) => {
            const open = isOpen(category);
            return (
              <li key={category} className="rounded-box border border-base-300">
                <div className="flex flex-wrap items-center gap-2 p-2">
                  <button
                    type="button"
                    onClick={() => toggleOpen(category)}
                    aria-expanded={open}
                    aria-label={`${category}を開閉`}
                    className="btn btn-ghost btn-xs"
                  >
                    <span aria-hidden="true" className={`transition-transform ${open ? "rotate-180" : ""}`}>
                      ▼
                    </span>
                  </button>

                  {editingCategory === category ? (
                    <form
                      onSubmit={(e) => handleRenameSubmit(category, e)}
                      className="flex flex-1 flex-wrap items-center gap-2"
                    >
                      <input
                        aria-label={`${category}の新しい大項目名`}
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        className="input input-bordered input-sm"
                        autoFocus
                      />
                      <button type="submit" disabled={mutateState.status === "loading"} className="btn btn-primary btn-xs">
                        保存
                      </button>
                      <button type="button" onClick={() => setEditingCategory(null)} className="btn btn-xs">
                        キャンセル
                      </button>
                    </form>
                  ) : (
                    <>
                      <span className={`flex-1 ${SECTION_HEADING_CLASS.replace("mb-3 border-b border-base-300 pb-2 ", "")}`}>
                        {category}
                        <span className="ml-2 text-sm font-normal text-base-content/60">
                          ({categoryPairs.length}件)
                        </span>
                      </span>
                      <button type="button" onClick={() => startRename(category)} className="btn btn-ghost btn-xs">
                        名前変更
                      </button>
                      {confirmingCategoryDelete === category ? (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-error">予算も削除されます</span>
                          <button
                            type="button"
                            onClick={() => handleCategoryDeleteClick(category)}
                            className="btn btn-error btn-xs"
                          >
                            本当に削除
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmingCategoryDelete(null)}
                            className="btn btn-xs"
                          >
                            キャンセル
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleCategoryDeleteClick(category)}
                          className="btn btn-error btn-outline btn-xs"
                        >
                          大項目を削除
                        </button>
                      )}
                    </>
                  )}
                </div>

                {open && (
                  <ul className="flex flex-col gap-2 border-t border-base-300 p-2">
                    {categoryPairs.map(({ localId, category: pairCategory, subcategory }) => (
                      <li key={localId} className="flex items-center gap-2">
                        <input
                          key={`${localId}-subcategory-${subcategory}`}
                          aria-label={`${pairCategory}/${subcategory}の中項目`}
                          defaultValue={subcategory}
                          onBlur={(e) => {
                            const value = e.target.value.trim();
                            if (value && value !== subcategory) {
                              updateCategoryPair({
                                oldCategory: pairCategory,
                                oldSubcategory: subcategory,
                                newCategory: pairCategory,
                                newSubcategory: value,
                              });
                            }
                          }}
                          className="input input-bordered input-sm w-32"
                        />
                        {confirmingKey === `${pairCategory}::${subcategory}` ? (
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => handleDeleteClick(pairCategory, subcategory)}
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
                            onClick={() => handleDeleteClick(pairCategory, subcategory)}
                            className="btn btn-error btn-outline btn-xs"
                          >
                            削除
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
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
    </div>
  );
}
