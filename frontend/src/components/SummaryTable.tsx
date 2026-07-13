import { useState } from "react";
import type { SummaryResponse } from "../types/api";
import { formatAmount } from "../lib/money";
import { CategoryPieChart } from "./CategoryPieChart";
import { TransactionList } from "./TransactionList";

interface SummaryTableProps {
  data: SummaryResponse | null;
  errorMessage: string | null;
  isLoading: boolean;
  hideAmounts: boolean;
}

export function SummaryTable({ data, errorMessage, isLoading, hideAmounts }: SummaryTableProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  if (isLoading) {
    return (
      <p className="flex items-center gap-2">
        <span className="loading loading-spinner loading-sm" />
        読み込み中...
      </p>
    );
  }

  if (errorMessage) {
    return (
      <p role="alert" className="alert alert-error">
        エラー: {errorMessage}
      </p>
    );
  }

  if (!data) {
    return <p className="text-base-content/70">この期間のデータはありません</p>;
  }

  if (data.categories.length === 0) {
    const unitLabel = data.unit === "year" ? "年" : data.unit === "week" ? "週" : "月";
    return <p className="text-base-content/70">この{unitLabel}のデータはありません</p>;
  }

  const selected = data.categories.find((c) => c.name === selectedCategory) ?? null;
  const amountText = (amount: number) => (hideAmounts ? "***" : formatAmount(amount));

  return (
    <div>
      <p data-testid="period-label" className="mb-2 text-sm text-base-content/70">
        {data.label}
      </p>
      <div className="mb-3 flex gap-6">
        <p>
          合計支出: <span className="font-semibold text-error">{amountText(data.totalExpense)}</span>
        </p>
        <p>
          合計収入: <span className="font-semibold text-success">{amountText(data.totalIncome)}</span>
        </p>
      </div>

      <CategoryPieChart categories={data.categories} onSelectCategory={setSelectedCategory} hideAmounts={hideAmounts} />

      <div className="mt-4 overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>カテゴリー</th>
              <th>金額</th>
            </tr>
          </thead>
          <tbody>
            {data.categories.map((category) => (
              <tr key={category.name}>
                <td>
                  <button
                    type="button"
                    className="link link-hover text-left"
                    onClick={() => setSelectedCategory(category.name)}
                  >
                    {category.name}
                  </button>
                </td>
                <td>{amountText(category.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <TransactionList
          title={selected.name}
          transactions={selected.transactions}
          onClose={() => setSelectedCategory(null)}
          hideAmounts={hideAmounts}
        />
      )}
    </div>
  );
}
