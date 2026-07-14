import { useState } from "react";
import { useBudgets } from "../hooks/useBudgets";
import { useCategories } from "../hooks/useCategories";
import { PageHeader } from "./PageHeader";
import { SectionCard } from "./SectionCard";
import { formatAmount } from "../lib/money";

// カンマ・円などを取り除き数値に変換する（入力欄のカンマ区切り表示に対応するため）
function parseAmountInput(value: string): number {
  return Number(value.replace(/[^0-9]/g, ""));
}

const NEW_CATEGORY_VALUE = "__new__";

const RECOMMENDED_CATEGORIES = ["食費", "交通費", "住居", "水道光熱費", "通信費", "娯楽", "医療", "保険", "その他"];

interface BudgetScreenProps {
  onBack: () => void;
}

export function BudgetScreen({ onBack }: BudgetScreenProps) {
  const { status, budgets, errorMessage, mutateState, upsertBudget, deleteBudget } = useBudgets();
  const { status: categoriesStatus, categories, errorMessage: categoriesErrorMessage } = useCategories();
  const [newCategory, setNewCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [confirmingCategory, setConfirmingCategory] = useState<string | null>(null);

  const categoryNames = Object.keys(categories);
  const budgetedCategories = new Set(budgets.map((b) => b.category));
  const unbudgetedExistingCategories = categoryNames.filter((name) => !budgetedCategories.has(name));
  const recommendedCategories = RECOMMENDED_CATEGORIES.filter(
    (name) => !categoryNames.includes(name) && !budgetedCategories.has(name),
  );

  const isNewCategorySelected = newCategory === NEW_CATEGORY_VALUE;
  const categoryToSubmit = isNewCategorySelected ? customCategory.trim() : newCategory;
  const totalBudget = budgets.reduce((sum, b) => sum + b.monthlyBudget, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(newAmount);
    if (!categoryToSubmit || !Number.isFinite(amount) || amount < 0) return;

    const saved = await upsertBudget({ category: categoryToSubmit, monthlyBudget: amount });
    if (saved) {
      setNewCategory("");
      setCustomCategory("");
      setNewAmount("");
    }
  };

  const handleDeleteClick = (category: string) => {
    if (confirmingCategory === category) {
      setConfirmingCategory(null);
      deleteBudget({ category });
    } else {
      setConfirmingCategory(category);
    }
  };

  const isLoading = status === "loading" || categoriesStatus === "loading";
  const isError = status === "error" || categoriesStatus === "error";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="予算" onBack={onBack} />

      <SectionCard title="大項目別の月間予算">
        {isLoading ? (
          <p className="flex items-center gap-2">
            <span className="loading loading-spinner loading-sm" />
            読み込み中...
          </p>
        ) : isError ? (
          <p role="alert" className="alert alert-error">
            エラー: {errorMessage ?? categoriesErrorMessage}
          </p>
        ) : (
          <div className="flex flex-col gap-4" data-testid="budget-settings">
            {budgets.length === 0 ? (
              <p className="text-base-content/70">登録されている予算はありません</p>
            ) : (
              <>
                <p className="text-sm font-medium">
                  合計: <span className="text-base">{formatAmount(totalBudget)}円</span>
                </p>
                <ul className="flex flex-col gap-2">
                  {budgets.map((budget) => (
                    <li key={budget.category} className="flex items-center gap-2">
                      <span className="w-32 font-medium">{budget.category}</span>
                      <input
                        key={`${budget.category}-${budget.monthlyBudget}`}
                        type="text"
                        inputMode="numeric"
                        aria-label={`${budget.category}の月間予算額`}
                        defaultValue={formatAmount(budget.monthlyBudget)}
                        onBlur={(e) => {
                          const amount = parseAmountInput(e.target.value);
                          if (Number.isFinite(amount) && amount >= 0 && amount !== budget.monthlyBudget) {
                            upsertBudget({ category: budget.category, monthlyBudget: amount });
                          }
                        }}
                        className="input input-bordered input-sm w-32"
                      />
                    {confirmingCategory === budget.category ? (
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(budget.category)}
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
                        onClick={() => handleDeleteClick(budget.category)}
                        className="btn btn-error btn-outline btn-xs"
                      >
                        削除
                      </button>
                    )}
                  </li>
                  ))}
                </ul>
              </>
            )}

            <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium">大項目</span>
                <select
                  aria-label="予算を設定する大項目"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="select select-bordered select-sm"
                >
                  <option value="">選択してください</option>
                  {unbudgetedExistingCategories.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                  {recommendedCategories.map((name) => (
                    <option key={name} value={name}>
                      {name}（推奨）
                    </option>
                  ))}
                  <option value={NEW_CATEGORY_VALUE}>新規入力</option>
                </select>
              </label>

              {isNewCategorySelected && (
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium">新しい大項目名</span>
                  <input
                    type="text"
                    aria-label="新しい大項目名"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="input input-bordered input-sm"
                  />
                </label>
              )}

              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium">月間予算額</span>
                <input
                  type="number"
                  min={0}
                  aria-label="新しい月間予算額"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  className="input input-bordered input-sm"
                />
              </label>
              <button
                type="submit"
                disabled={mutateState.status === "loading" || !categoryToSubmit}
                className="btn btn-primary btn-sm"
              >
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
        )}
      </SectionCard>
    </div>
  );
}
