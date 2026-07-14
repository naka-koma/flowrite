import { useEffect, useRef, useState } from "react";
import { MonthSelector } from "./MonthSelector";
import { PageHeader } from "./PageHeader";
import { SectionCard } from "./SectionCard";
import { useTransactionList, type TransactionPageSize } from "../hooks/useTransactionList";
import { useUpdateCategory } from "../hooks/useUpdateCategory";
import { useCategories } from "../hooks/useCategories";
import { formatAmount } from "../lib/money";
import type { TransactionRow } from "../types/api";

interface TransactionScreenProps {
  hideAmounts: boolean;
  onBack: () => void;
}

const PAGE_SIZE_OPTIONS: { value: TransactionPageSize; label: string }[] = [
  { value: 10, label: "10件" },
  { value: 25, label: "25件" },
  { value: 50, label: "50件" },
  { value: 100, label: "100件" },
  { value: "all", label: "すべて" },
];

const ADD_CATEGORY_VALUE = "__add_new__";

export function TransactionScreen({ hideAmounts, onBack }: TransactionScreenProps) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [pageSize, setPageSize] = useState<TransactionPageSize>(50);
  const [page, setPage] = useState(1);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [addingCategoryForId, setAddingCategoryForId] = useState<string | null>(null);
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [newSubcategoryInput, setNewSubcategoryInput] = useState("");

  const list = useTransactionList({ year, month, pageSize, page });
  const { updateState, updateCategory } = useUpdateCategory();
  const categories = useCategories();

  const sentinelRef = useRef<HTMLTableRowElement | null>(null);

  useEffect(() => {
    if (pageSize !== "all" || !list.hasMore) return;
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          list.loadMore();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(node);

    return () => observer.disconnect();
  }, [pageSize, list.hasMore, list.transactions.length, list.loadMore]);

  const handlePeriodChange = (newYear: number, newMonth: number) => {
    setYear(newYear);
    setMonth(newMonth);
    setPage(1);
  };

  const handlePageSizeChange = (value: string) => {
    setPageSize(value === "all" ? "all" : (Number(value) as TransactionPageSize));
    setPage(1);
  };

  const commitChange = async (
    row: TransactionRow,
    patch: Partial<Pick<TransactionRow, "category" | "subcategory" | "memo">>,
  ) => {
    const previous = { category: row.category, subcategory: row.subcategory, memo: row.memo };
    const next = { ...previous, ...patch };

    setSavingId(row.id);
    list.updateLocalTransaction(row.id, patch);

    const ok = await updateCategory({ id: row.id, ...next });

    setSavingId(null);
    if (!ok) {
      list.updateLocalTransaction(row.id, previous);
    }
  };

  const handleAddCategorySubmit = async (row: TransactionRow) => {
    const category = newCategoryInput.trim();
    const subcategory = newSubcategoryInput.trim();
    if (!category || !subcategory) return;

    const added = await categories.addCategory({ category, subcategory });
    if (added) {
      setAddingCategoryForId(null);
      setNewCategoryInput("");
      setNewSubcategoryInput("");
      await commitChange(row, { category, subcategory });
    }
  };

  const totalCount = list.totalCount;

  function renderControls() {
    if (pageSize === "all") {
      return (
        <p className="text-sm text-base-content/70">
          {totalCount}件中 {list.transactions.length}件を読み込み済み
          {list.status === "loading" && list.transactions.length > 0 && (
            <span className="loading loading-spinner loading-xs ml-2" />
          )}
        </p>
      );
    }

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    return (
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-base-content/70">
          {totalCount}件中 {totalCount === 0 ? 0 : (page - 1) * pageSize + 1}〜
          {Math.min(page * pageSize, totalCount)}件を表示
          {list.status === "loading" && <span className="loading loading-spinner loading-xs ml-2" />}
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
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="取引一覧" onBack={onBack} />

      <SectionCard>
          <div className="mb-4 flex flex-wrap items-center gap-4">
            <MonthSelector year={year} month={month} onChange={handlePeriodChange} />
            <label className="flex items-center gap-2 text-sm">
              表示件数
              <select
                aria-label="表示件数"
                value={String(pageSize)}
                onChange={(e) => handlePageSizeChange(e.target.value)}
                className="select select-bordered select-sm"
              >
                {PAGE_SIZE_OPTIONS.map((opt) => (
                  <option key={opt.label} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {list.status === "loading" && list.transactions.length === 0 && (
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
              更新に失敗しました: {updateState.errorMessage}
            </p>
          )}

          {categories.addState.status === "error" && (
            <p role="alert" className="alert alert-error mb-2">
              カテゴリの追加に失敗しました: {categories.addState.errorMessage}
            </p>
          )}

          {list.transactions.length === 0 && list.status !== "loading" && (
            <p className="text-base-content/70">この月の取引はありません</p>
          )}

          {list.transactions.length > 0 && (
            <>
              <div className="mb-2">{renderControls()}</div>

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
                    {list.transactions.map((t) => {
                      const subcategoryOptions = list.subcategoryOptionsByCategory[t.category] ?? [];
                      const isSaving = savingId === t.id;
                      const isAddingCategory = addingCategoryForId === t.id;

                      return (
                        <tr key={t.id}>
                          <td>{t.date}</td>
                          <td>{t.content}</td>
                          <td>{hideAmounts ? "***" : formatAmount(t.amount)}</td>
                          <td>{t.institution}</td>
                          <td>
                            {isAddingCategory ? (
                              <div className="flex flex-col gap-1">
                                <input
                                  aria-label="新しい大項目"
                                  value={newCategoryInput}
                                  onChange={(e) => setNewCategoryInput(e.target.value)}
                                  placeholder="大項目"
                                  className="input input-bordered input-xs"
                                />
                                <input
                                  aria-label="新しい中項目"
                                  value={newSubcategoryInput}
                                  onChange={(e) => setNewSubcategoryInput(e.target.value)}
                                  placeholder="中項目"
                                  className="input input-bordered input-xs"
                                />
                                <div className="flex gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleAddCategorySubmit(t)}
                                    className="btn btn-xs btn-primary"
                                  >
                                    追加
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setAddingCategoryForId(null)}
                                    className="btn btn-xs"
                                  >
                                    キャンセル
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <select
                                aria-label="大項目"
                                value={t.category}
                                disabled={isSaving}
                                onChange={(e) => {
                                  if (e.target.value === ADD_CATEGORY_VALUE) {
                                    setAddingCategoryForId(t.id);
                                    setNewCategoryInput("");
                                    setNewSubcategoryInput("");
                                    return;
                                  }
                                  commitChange(t, { category: e.target.value });
                                }}
                                className="select select-bordered select-sm"
                              >
                                {!list.categoryOptions.includes(t.category) && (
                                  <option value={t.category}>{t.category}</option>
                                )}
                                {list.categoryOptions.map((c) => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ))}
                                <option value={ADD_CATEGORY_VALUE}>+ 新規追加</option>
                              </select>
                            )}
                          </td>
                          <td>
                            <select
                              aria-label="中項目"
                              value={t.subcategory}
                              disabled={isSaving || isAddingCategory}
                              onChange={(e) => commitChange(t, { subcategory: e.target.value })}
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
                          <td>
                            <input
                              key={`${t.id}-${t.memo}`}
                              aria-label="メモ"
                              defaultValue={t.memo}
                              disabled={isSaving}
                              onBlur={(e) => {
                                if (e.target.value !== t.memo) {
                                  commitChange(t, { memo: e.target.value });
                                }
                              }}
                              className="input input-bordered input-sm"
                            />
                          </td>
                        </tr>
                      );
                    })}
                    {pageSize === "all" && <tr ref={sentinelRef} aria-hidden="true" />}
                  </tbody>
                </table>
              </div>

              <div className="mt-4">{renderControls()}</div>
            </>
          )}
      </SectionCard>
    </div>
  );
}
