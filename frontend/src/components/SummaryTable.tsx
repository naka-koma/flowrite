import type { SummaryResponse } from "../types/api";

interface SummaryTableProps {
  data: SummaryResponse | null;
  errorMessage: string | null;
  isLoading: boolean;
}

export function SummaryTable({ data, errorMessage, isLoading }: SummaryTableProps) {
  if (isLoading) {
    return <p>読み込み中...</p>;
  }

  if (errorMessage) {
    return <p role="alert">エラー: {errorMessage}</p>;
  }

  if (!data || data.categories.length === 0) {
    return <p>この月のデータはありません</p>;
  }

  return (
    <div>
      <p>合計支出: {data.totalExpense}</p>
      <p>合計収入: {data.totalIncome}</p>
      <table>
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
  );
}
