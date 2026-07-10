import type { SummaryResponse } from "../types/api";

interface SummaryTableProps {
  data: SummaryResponse | null;
  errorMessage: string | null;
  isLoading: boolean;
}

export function SummaryTable({ data, errorMessage, isLoading }: SummaryTableProps) {
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

  if (!data || data.categories.length === 0) {
    return <p className="text-base-content/70">この月のデータはありません</p>;
  }

  return (
    <div>
      <div className="mb-3 flex gap-6">
        <p>
          合計支出: <span className="font-semibold text-error">{data.totalExpense}</span>
        </p>
        <p>
          合計収入: <span className="font-semibold text-success">{data.totalIncome}</span>
        </p>
      </div>
      <div className="overflow-x-auto">
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
                <td>{category.name}</td>
                <td>{category.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
