import { useState } from "react";
import { MonthSelector } from "./MonthSelector";
import { TrendChart } from "./TrendChart";
import { PeriodComparison } from "./PeriodComparison";
import { CategoryBreakdown } from "./CategoryBreakdown";
import { useSummary } from "../hooks/useSummary";
import { useTrend } from "../hooks/useTrend";
import { formatAmount } from "../lib/money";
import { SECTION_HEADING_CLASS } from "../lib/ui";

interface ReportScreenProps {
  hideAmounts: boolean;
  trendVisibleCount: number;
  onBack: () => void;
}

export function ReportScreen({ hideAmounts, trendVisibleCount, onBack }: ReportScreenProps) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const summary = useSummary({ unit: "month", year, month });
  const trend = useTrend("month");

  const amountText = (amount: number) => (hideAmounts ? "***" : formatAmount(amount));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <button type="button" onClick={onBack} aria-label="ダッシュボードに戻る" className="btn btn-ghost btn-sm">
          ‹ 戻る
        </button>
        <h1 className="text-xl font-bold">レポート</h1>
      </div>

      <section className="card bg-base-100">
        <div className="card-body p-4 sm:p-6">
          <MonthSelector
            year={year}
            month={month}
            onChange={(newYear, newMonth) => {
              setYear(newYear);
              setMonth(newMonth);
            }}
          />

          {summary.status === "loading" && (
            <p className="flex items-center gap-2">
              <span className="loading loading-spinner loading-sm" />
              読み込み中...
            </p>
          )}

          {summary.errorMessage && (
            <p role="alert" className="alert alert-error">
              エラー: {summary.errorMessage}
            </p>
          )}

          {summary.data && (
            <>
              <p data-testid="report-period-label" className="mb-2 text-sm text-base-content/70">
                {summary.data.label}
              </p>
              <div className="mb-4 flex gap-6">
                <p>
                  収入: <span className="font-semibold text-success">{amountText(summary.data.totalIncome)}</span>
                </p>
                <p>
                  支出: <span className="font-semibold text-error">{amountText(summary.data.totalExpense)}</span>
                </p>
                <p>
                  収支:{" "}
                  <span className="font-semibold">
                    {amountText(summary.data.totalIncome - summary.data.totalExpense)}
                  </span>
                </p>
              </div>

              {summary.data.comparison && (
                <PeriodComparison
                  previousMonth={summary.data.comparison.previousMonth}
                  previousYear={summary.data.comparison.previousYear}
                  hideAmounts={hideAmounts}
                />
              )}
            </>
          )}
        </div>
      </section>

      <section className="card bg-base-100">
        <div className="card-body p-4 sm:p-6">
          <h2 className={SECTION_HEADING_CLASS}>全体推移</h2>
          <TrendChart
            data={trend.data}
            errorMessage={trend.errorMessage}
            isLoading={trend.status === "loading"}
            hideAmounts={hideAmounts}
            visibleCount={trendVisibleCount}
          />
        </div>
      </section>

      <section className="card bg-base-100">
        <div className="card-body p-4 sm:p-6">
          <CategoryBreakdown
            title="収入内訳"
            categories={summary.data?.incomeCategories ?? []}
            hideAmounts={hideAmounts}
            emptyMessage="この月の収入データはありません"
          />
        </div>
      </section>

      <section className="card bg-base-100">
        <div className="card-body p-4 sm:p-6">
          <CategoryBreakdown
            title="支出内訳"
            categories={summary.data?.categories ?? []}
            hideAmounts={hideAmounts}
            emptyMessage="この月の支出データはありません"
          />
        </div>
      </section>
    </div>
  );
}
