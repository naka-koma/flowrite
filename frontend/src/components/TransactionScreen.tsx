import { useState } from "react";
import { MonthSelector } from "./MonthSelector";
import { useTransactionList } from "../hooks/useTransactionList";
import { useUpdateCategory } from "../hooks/useUpdateCategory";
import { formatAmount } from "../lib/money";

interface TransactionScreenProps {
  hideAmounts: boolean;
  onBack: () => void;
}

const PAGE_SIZE = 50;

export function TransactionScreen({ hideAmounts, onBack }: TransactionScreenProps) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);

  const list = useTransactionList({ year, month, page, pageSize: PAGE_SIZE });
  const { updateState, updateCategory } = useUpdateCategory();

  const handlePeriodChange = (newYear: number, newMonth: number) => {
    setYear(newYear);
    setMonth(newMonth);
    setPage(1);
  };

  const handleCategoryChange = async (id: string, category: string, subcategory: string) => {
    setEditingId(id);
    const ok = await updateCategory({ id, category, subcategory });
    setEditingId(null);
    if (ok) {
      list.reload();
    }
  };

  const totalCount = list.data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <button type="button" onClick={onBack} aria-label="ダッシュボードに戻る" className="btn btn-ghost btn-sm">
          ‹ 戻る
        </button>
        <h1 className="text-xl font-bold">取引一覧</h1>
      </div>

      <section className="card bg-base-100">
        <div className="card-body p-4 sm:p-6">
          <MonthSelector year={year} month={month} onChange={handlePeriodChange} />

          {list.status === "loading" && (
            <p className="flex items-center gap-2">
              <span className="loading loading-spinner loading-sm" />
              読み込み中...
            </p>
          )}

          {list.status === "error" && (
            <p role="alert" className="alert alert-error">
              エラー: {list.errorMessage}
            </p>
          )}

          {updateState.status === "error" && (
            <p role="alert" className="alert alert-error mb-2">
              カテゴリの更新に失敗しました: {updateState.errorMessage}
            </p>
          )}

          {list.data && list.data.transactions.length === 0 && (
            <p className="text-base-content/70">この月の取引はありません</p>
          )}

          {list.data && list.data.transactions.length > 0 && (
            <>
              <div className="overflow-x-auto">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>日付</th>
                      <th>内容</th>
                      <th>金額</th>
                      <th>保有金融機関</th>
                      <th>大項目</th>
                      <th>中項目</th>
                      <th>メモ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.data.transactions.map((t) => {
                      const subcategoryOptions = list.data?.subcategoryOptionsByCategory[t.category] ?? [];
                      const isSaving = editingId === t.id && updateState.status === "loading";

                      return (
                        <tr key={t.id}>
                          <td>{t.date}</td>
                          <td>{t.content}</td>
                          <td>{hideAmounts ? "***" : formatAmount(t.amount)}</td>
                          <td>{t.institution}</td>
                          <td>
                            <select
                              aria-label="大項目"
                              value={t.category}
                              disabled={isSaving}
                              onChange={(e) => handleCategoryChange(t.id, e.target.value, t.subcategory)}
                              className="select select-bordered select-sm"
                            >
                              {!list.data?.categoryOptions.includes(t.category) && (
                                <option value={t.category}>{t.category}</option>
                              )}
                              {list.data?.categoryOptions.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <select
                              aria-label="中項目"
                              value={t.subcategory}
                              disabled={isSaving}
                              onChange={(e) => handleCategoryChange(t.id, t.category, e.target.value)}
                              className="select select-bordered select-sm"
                            >
                              {!subcategoryOptions.includes(t.subcategory) && (
                                <option value={t.subcategory}>{t.subcategory}</option>
                              )}
                              {subcategoryOptions.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>{t.memo}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex items-center justify-between gap-2">
                <p className="text-sm text-base-content/70">
                  {totalCount}件中 {(page - 1) * PAGE_SIZE + 1}〜{Math.min(page * PAGE_SIZE, totalCount)}件を表示
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="btn btn-sm"
                  >
                    前へ
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="btn btn-sm"
                  >
                    次へ
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
