import type { Transaction } from "../types/api";
import { formatAmount } from "../lib/money";

interface TransactionListProps {
  categoryName: string;
  transactions: Transaction[];
  onClose: () => void;
  hideAmounts: boolean;
}

export function TransactionList({ categoryName, transactions, onClose, hideAmounts }: TransactionListProps) {
  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-semibold">{categoryName}の取引明細</h3>
        <button type="button" onClick={onClose} className="btn btn-ghost btn-sm">
          閉じる
        </button>
      </div>
      {transactions.length === 0 ? (
        <p className="text-base-content/70">取引がありません</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>日付</th>
                <th>内容</th>
                <th>金額</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t, i) => (
                <tr key={`${t.date}-${t.content}-${i}`}>
                  <td>{t.date}</td>
                  <td>{t.content}</td>
                  <td>{hideAmounts ? "***" : formatAmount(t.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
