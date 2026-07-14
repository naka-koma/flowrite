import { useBudgetVariance } from "../hooks/useBudgetVariance";
import { formatAmount } from "../lib/money";

interface BudgetVarianceSectionProps {
  year: number;
  month: number;
  hideAmounts: boolean;
}

export function BudgetVarianceSection({ year, month, hideAmounts }: BudgetVarianceSectionProps) {
  const { status, data, errorMessage } = useBudgetVariance({ year, month });
  const amountText = (amount: number) => (hideAmounts ? "***" : formatAmount(amount));

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

  const entries = data?.entries ?? [];

  if (entries.length === 0) {
    return (
      <p className="text-base-content/70">
        予算が設定されていません。設定画面の「予算」ページから登録してください
      </p>
    );
  }

  return (
    <div className="overflow-x-auto" data-testid="budget-variance">
      <table className="table">
        <thead>
          <tr>
            <th>大項目</th>
            <th>予算</th>
            <th>実績</th>
            <th>乖離額</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.category}>
              <td>{entry.category}</td>
              <td>{amountText(entry.budget)}</td>
              <td>{amountText(entry.actual)}</td>
              <td className={entry.variance > 0 ? "font-semibold text-error" : ""}>
                {entry.variance > 0 ? "+" : ""}
                {amountText(entry.variance)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
