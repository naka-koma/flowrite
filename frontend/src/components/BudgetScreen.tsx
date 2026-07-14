import { useState } from "react";
import { useBudgets } from "../hooks/useBudgets";
import { useCategories } from "../hooks/useCategories";
import { PageHeader } from "./PageHeader";
import { SectionCard } from "./SectionCard";

interface BudgetScreenProps {
  onBack: () => void;
}

export function BudgetScreen({ onBack }: BudgetScreenProps) {
  const { status, budgets, errorMessage, mutateState, upsertBudget, deleteBudget } = useBudgets();
  const { status: categoriesStatus, categories, errorMessage: categoriesErrorMessage } = useCategories();
  const [newCategory, setNewCategory] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [confirmingCategory, setConfirmingCategory] = useState<string | null>(null);

  const categoryNames = Object.keys(categories);
  const budgetedCategories = new Set(budgets.map((b) => b.category));
  const unbudgetedCategoryNames = categoryNames.filter((name) => !budgetedCategories.has(name));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(newAmount);
    if (!newCategory || !Number.isFinite(amount) || amount < 0) return;

    const saved = await upsertBudget({ category: newCategory, monthlyBudget: amount });
    if (saved) {
      setNewCategory("");
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

  if (status === "loading" || categoriesStatus === "loading") {
    return (
      <p className="flex items-center gap-2">
        <span className="loading loading-spinner loading-sm" />
        読み込み中...
      </p>
    );
  }

  if (status === "error" || categoriesStatus === "error") {
    return (
      <p role="alert" className="alert alert-error">
        エラー: {errorMessage ?? categoriesErrorMessage}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="予算" onBack={onBack} />

      <SectionCard title="大項目別の月間予算">
          <div className="flex flex-col gap-4" data-testid="budget-settings">
            {budgets.length === 0 ? (
              <p className="text-base-content/70">登録されている予算はありません</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {budgets.map((budget) => (
                  <li key={budget.category} className="flex items-center gap-2">
                    <span className="w-32 font-medium">{budget.category}</span>
                    <input
                      key={`${budget.category}-${budget.monthlyBudget}`}
                      type="number"
                      min={0}
                      aria-label={`${budget.category}の月間予算額`}
                      defaultValue={budget.monthlyBudget}
                      onBlur={(e) => {
                        const amount = Number(e.target.value);
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
            )}

            {unbudgetedCategoryNames.length === 0 ? (
              <p className="text-base-content/70 text-sm">すべてのカテゴリに予算が設定されています</p>
            ) : (
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
                    {unbudgetedCategoryNames.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
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
                  disabled={mutateState.status === "loading" || !newCategory}
                  className="btn btn-primary btn-sm"
                >
                  {mutateState.status === "loading" && <span className="loading loading-spinner loading-xs" />}
                  追加
                </button>
              </form>
            )}

            {mutateState.status === "error" && (
              <p role="alert" className="alert alert-error">
                エラー: {mutateState.errorMessage}
              </p>
            )}
          </div>
      </SectionCard>
    </div>
  );
}
