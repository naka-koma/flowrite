import { useState } from "react";
import { useCategories } from "../hooks/useCategories";

export function CategorySettings() {
  const { status, categories, errorMessage, addState, addCategory } = useCategories();
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");

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
    <div className="flex flex-col gap-4">
      {categoryNames.length === 0 ? (
        <p className="text-base-content/70">登録されているカテゴリはありません</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {categoryNames.map((name) => (
            <li key={name}>
              <span className="font-medium">{name}</span>
              <span className="text-base-content/70">: {(categories[name] ?? []).join("、")}</span>
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
