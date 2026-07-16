import { useEffect, useState } from "react";
import { useAiCategorySuggestions } from "../hooks/useAiCategorySuggestions";
import { formatAmount } from "../lib/money";
import type {
  AddCategoryParams,
  AiCategorySuggestion,
  AiCategorySuggestionCategoryFilterEntry,
  AiCategorySuggestionScope,
  CategoryMaster,
} from "../types/api";

interface AiCategorySuggestionsProps {
  year: number;
  month: number;
  hideAmounts: boolean;
  onApplied: () => void;
  categoryMaster: CategoryMaster;
  addCategory: (params: AddCategoryParams) => Promise<boolean>;
}

const SCOPE_LABELS: Record<AiCategorySuggestionScope, string> = {
  uncategorized: "未分類のみ",
  all: "選択中の年月の全件",
};

function categoryFilterKey(category: string, subcategory: string): string {
  return `${category} ${subcategory}`;
}

export function AiCategorySuggestions({
  year,
  month,
  hideAmounts,
  onApplied,
  categoryMaster,
  addCategory,
}: AiCategorySuggestionsProps) {
  const [scope, setScope] = useState<AiCategorySuggestionScope>("uncategorized");
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<Map<string, AiCategorySuggestionCategoryFilterEntry>>(
    new Map(),
  );
  const [institutionKeyword, setInstitutionKeyword] = useState("");
  const [contentKeyword, setContentKeyword] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  const [pendingNewCategoryConfirm, setPendingNewCategoryConfirm] = useState<AiCategorySuggestion[] | null>(null);
  const ai = useAiCategorySuggestions();

  useEffect(() => {
    if (ai.status === "success") {
      setCheckedIds(new Set(ai.suggestions.map((s) => s.id)));
    }
  }, [ai.status, ai.suggestions]);

  const toggleCategoryFilter = (category: string, subcategory: string) => {
    const key = categoryFilterKey(category, subcategory);
    setCategoryFilter((prev) => {
      const next = new Map(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.set(key, { category, subcategory });
      }
      return next;
    });
  };

  const handleFetch = () => {
    setPendingNewCategoryConfirm(null);
    ai.fetchSuggestions({
      year,
      month,
      scope,
      categoryFilter: categoryFilter.size > 0 ? Array.from(categoryFilter.values()) : undefined,
      institutionKeyword: institutionKeyword.trim() || undefined,
      contentKeyword: contentKeyword.trim() || undefined,
      amountMin: amountMin ? Number(amountMin) : undefined,
      amountMax: amountMax ? Number(amountMax) : undefined,
    });
  };

  const toggleChecked = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = (checked: boolean) => {
    setCheckedIds(checked ? new Set(ai.suggestions.map((s) => s.id)) : new Set());
  };

  const handleApply = async () => {
    const selected = ai.suggestions.filter((s) => checkedIds.has(s.id));
    if (selected.length === 0) return;

    if (!pendingNewCategoryConfirm) {
      const newPairs = Array.from(
        new Map(
          selected
            .filter((s) => s.isNewCategory)
            .map((s) => [categoryFilterKey(s.suggestedCategory, s.suggestedSubcategory), s]),
        ).values(),
      );
      if (newPairs.length > 0) {
        setPendingNewCategoryConfirm(newPairs);
        return;
      }
    }

    if (pendingNewCategoryConfirm) {
      for (const p of pendingNewCategoryConfirm) {
        await addCategory({ category: p.suggestedCategory, subcategory: p.suggestedSubcategory });
      }
    }

    const applyParams = selected.map((s) => ({ id: s.id, category: s.suggestedCategory, subcategory: s.suggestedSubcategory }));
    const ok = await ai.applySuggestions(applyParams);
    if (ok) {
      setPendingNewCategoryConfirm(null);
      onApplied();
    }
  };

  const allChecked = ai.suggestions.length > 0 && checkedIds.size === ai.suggestions.length;

  return (
    <div data-testid="ai-category-suggestions" className="mb-4 rounded-box border border-base-300 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-4">
        <div role="radiogroup" className="flex items-center gap-3">
          {(Object.keys(SCOPE_LABELS) as AiCategorySuggestionScope[]).map((s) => (
            <label key={s} className="flex items-center gap-1 text-sm">
              <input
                type="radio"
                name="ai-category-scope"
                checked={scope === s}
                onChange={() => setScope(s)}
                className="radio radio-sm"
              />
              {SCOPE_LABELS[s]}
            </label>
          ))}
        </div>
        <button type="button" onClick={() => setFiltersOpen((v) => !v)} className="btn btn-ghost btn-sm">
          絞り込み条件 {filtersOpen ? "▲" : "▼"}
        </button>
        <button
          type="button"
          onClick={handleFetch}
          disabled={ai.status === "loading"}
          className="btn btn-primary btn-sm"
        >
          {ai.status === "loading" && <span className="loading loading-spinner loading-xs" />}
          提案を取得
        </button>
      </div>

      {filtersOpen && (
        <div className="mb-3 flex flex-col gap-3 rounded-box border border-base-300 p-3">
          <div>
            <p className="mb-1 text-sm font-medium">大項目・中項目</p>
            <div className="max-h-48 overflow-y-auto">
              {Object.entries(categoryMaster).map(([category, subcategories]) => (
                <div key={category} className="mb-2">
                  <p className="text-sm font-semibold">{category}</p>
                  <div className="ml-4 flex flex-wrap gap-3">
                    {subcategories.map((subcategory) => {
                      const key = categoryFilterKey(category, subcategory);
                      return (
                        <label key={key} className="flex items-center gap-1 text-sm">
                          <input
                            type="checkbox"
                            checked={categoryFilter.has(key)}
                            onChange={() => toggleCategoryFilter(category, subcategory)}
                            className="checkbox checkbox-xs"
                          />
                          {subcategory}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              金融機関
              <input
                type="text"
                value={institutionKeyword}
                onChange={(e) => setInstitutionKeyword(e.target.value)}
                placeholder="部分一致"
                className="input input-bordered input-sm"
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              内容
              <input
                type="text"
                value={contentKeyword}
                onChange={(e) => setContentKeyword(e.target.value)}
                placeholder="部分一致"
                className="input input-bordered input-sm"
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              支出額(下限)
              <input
                type="number"
                value={amountMin}
                onChange={(e) => setAmountMin(e.target.value)}
                className="input input-bordered input-sm w-28"
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              支出額(上限)
              <input
                type="number"
                value={amountMax}
                onChange={(e) => setAmountMax(e.target.value)}
                className="input input-bordered input-sm w-28"
              />
            </label>
          </div>
        </div>
      )}

      {ai.status === "error" && (
        <p role="alert" className="alert alert-error">
          エラー: {ai.errorMessage}
        </p>
      )}

      {ai.status === "success" && ai.suggestions.length === 0 && (
        <p className="text-base-content/70">対象の取引がありません</p>
      )}

      {ai.status === "success" && ai.suggestions.length > 0 && (
        <>
          <div className="mb-2 flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                aria-label="すべて選択"
                checked={allChecked}
                onChange={(e) => toggleAll(e.target.checked)}
                className="checkbox checkbox-sm"
              />
              すべて選択
            </label>
            <button
              type="button"
              onClick={handleApply}
              disabled={checkedIds.size === 0 || ai.applyState.status === "loading"}
              className="btn btn-primary btn-sm"
            >
              {ai.applyState.status === "loading" && <span className="loading loading-spinner loading-xs" />}
              選択した項目を適用({checkedIds.size}件)
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th></th>
                  <th>日付</th>
                  <th>内容</th>
                  <th>金額</th>
                  <th>保有金融機関</th>
                  <th>現在の分類</th>
                  <th>提案分類</th>
                  <th>理由</th>
                </tr>
              </thead>
              <tbody>
                {ai.suggestions.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`${s.content}の提案を選択`}
                        checked={checkedIds.has(s.id)}
                        onChange={() => toggleChecked(s.id)}
                        className="checkbox checkbox-sm"
                      />
                    </td>
                    <td>{s.date}</td>
                    <td>{s.content}</td>
                    <td>{hideAmounts ? "***" : formatAmount(s.amount)}</td>
                    <td>{s.institution}</td>
                    <td>
                      {s.currentCategory || "未分類"}
                      {s.currentSubcategory ? ` / ${s.currentSubcategory}` : ""}
                    </td>
                    <td>
                      {s.suggestedCategory} / {s.suggestedSubcategory}
                      {s.isNewCategory && <span className="badge badge-warning badge-sm ml-2">未登録</span>}
                    </td>
                    <td className="text-sm text-base-content/70">{s.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pendingNewCategoryConfirm && (
            <div role="alert" className="alert alert-warning mt-2 flex-col items-start">
              <p>以下の新しいカテゴリが含まれています。登録してから適用しますか?</p>
              <ul className="list-disc pl-5 text-sm">
                {pendingNewCategoryConfirm.map((s) => (
                  <li key={categoryFilterKey(s.suggestedCategory, s.suggestedSubcategory)}>
                    {s.suggestedCategory} / {s.suggestedSubcategory}
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <button type="button" className="btn btn-sm" onClick={() => setPendingNewCategoryConfirm(null)}>
                  キャンセル
                </button>
                <button type="button" className="btn btn-primary btn-sm" onClick={handleApply}>
                  新規カテゴリを登録して適用
                </button>
              </div>
            </div>
          )}

          {ai.applyState.status === "success" && (
            <p className="mt-2 text-sm text-success">{ai.applyState.applied}件を適用しました</p>
          )}
          {ai.applyState.status === "error" && (
            <p role="alert" className="alert alert-error mt-2">
              エラー: {ai.applyState.errorMessage}
            </p>
          )}
        </>
      )}
    </div>
  );
}
