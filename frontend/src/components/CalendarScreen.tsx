import { useState } from "react";
import { useMonthlyCalendar } from "../hooks/useMonthlyCalendar";
import { formatAmount } from "../lib/money";

interface CalendarScreenProps {
  hideAmounts: boolean;
  onBack: () => void;
}

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const date = new Date(year, month - 1 + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

export function CalendarScreen({ hideAmounts, onBack }: CalendarScreenProps) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const calendar = useMonthlyCalendar({ year, month });

  const goToOffset = (delta: number) => {
    const next = shiftMonth(year, month, delta);
    setYear(next.year);
    setMonth(next.month);
  };

  const goToCurrentMonth = () => {
    setYear(now.getFullYear());
    setMonth(now.getMonth() + 1);
  };

  const amountText = (amount: number) => (hideAmounts ? "***" : formatAmount(amount));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <button type="button" onClick={onBack} aria-label="ダッシュボードに戻る" className="btn btn-ghost btn-sm">
          ‹ 戻る
        </button>
        <h1 className="text-xl font-bold">カレンダー</h1>
      </div>

      <section className="card bg-base-100">
        <div className="card-body p-4 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => goToOffset(-1)}
              aria-label="前の月"
              className="btn btn-square btn-sm"
            >
              ‹
            </button>
            <span data-testid="calendar-period-label" className="text-lg font-semibold">
              {year}年{month}月
            </span>
            <button
              type="button"
              onClick={() => goToOffset(1)}
              aria-label="次の月"
              className="btn btn-square btn-sm"
            >
              ›
            </button>
            <button type="button" onClick={goToCurrentMonth} className="btn btn-sm ml-2">
              当月
            </button>
          </div>

          {calendar.status === "loading" && (
            <p className="flex items-center gap-2">
              <span className="loading loading-spinner loading-sm" />
              読み込み中...
            </p>
          )}

          {calendar.status === "error" && (
            <p role="alert" className="alert alert-error">
              エラー: {calendar.errorMessage}
            </p>
          )}

          {calendar.data && (
            <>
              <div className="mb-6 flex flex-wrap gap-6">
                <p>
                  当月収入: <span className="font-semibold text-info">{amountText(calendar.data.totalIncome)}</span>
                </p>
                <p>
                  当月支出: <span className="font-semibold text-error">{amountText(calendar.data.totalExpense)}</span>
                </p>
                <p>
                  当月収支: <span className="font-semibold">{amountText(calendar.data.balance)}</span>
                </p>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-sm">
                {WEEKDAY_LABELS.map((label) => (
                  <div key={label} className="py-1 font-medium text-base-content/70">
                    {label}
                  </div>
                ))}

                {Array.from({ length: calendar.data.days[0]?.dayOfWeek ?? 0 }).map((_, i) => (
                  <div key={`blank-${i}`} />
                ))}

                {calendar.data.days.map((day) => {
                  const hasData = day.totalIncome > 0 || day.totalExpense > 0;
                  const balanceClass = !hasData
                    ? "text-base-content/40"
                    : day.balance < 0
                      ? "text-error"
                      : "text-info";

                  return (
                    <div key={day.date} className="rounded-box border border-base-300 p-1">
                      <div className="text-xs text-base-content/70">{day.day}</div>
                      {hasData && (
                        <div className={`text-xs font-semibold ${balanceClass}`}>
                          {hideAmounts ? "***" : formatAmount(day.balance)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
