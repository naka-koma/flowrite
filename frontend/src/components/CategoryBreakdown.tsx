import { useState } from "react";
import type { CategoryTotal } from "../types/api";
import { formatAmount } from "../lib/money";
import { CategoryPieChart } from "./CategoryPieChart";
import { TransactionList } from "./TransactionList";

interface CategoryBreakdownProps {
  categories: CategoryTotal[];
  hideAmounts: boolean;
  emptyMessage: string;
}

export function CategoryBreakdown({ categories, hideAmounts, emptyMessage }: CategoryBreakdownProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const selected = categories.find((c) => c.name === selectedCategory) ?? null;
  const amountText = (amount: number) => (hideAmounts ? "***" : formatAmount(amount));

  return (
    <div>
      {categories.length === 0 ? (
        <p className="text-base-content/70">{emptyMessage}</p>
      ) : (
        <>
          <CategoryPieChart categories={categories} onSelectCategory={setSelectedCategory} hideAmounts={hideAmounts} />

          <div className="mt-4 overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>カテゴリー</th>
                  <th>金額</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
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
        </>
      )}
    </div>
  );
}
