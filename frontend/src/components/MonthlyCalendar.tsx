import { useState } from "react";
import { useMonthlyCalendar } from "../hooks/useMonthlyCalendar";
import { formatAmount } from "../lib/money";
import { TransactionList } from "./TransactionList";

interface MonthlyCalendarProps {
  year: number;
  month: number;
  hideAmounts: boolean;
}

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

export function MonthlyCalendar({ year, month, hideAmounts }: MonthlyCalendarProps) {
  const calendar = useMonthlyCalendar({ year, month });
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const amountText = (amount: number) => (hideAmounts ? "***" : formatAmount(amount));
  const selected = calendar.data?.days.find((d) => d.day === selectedDay) ?? null;

  return (
    <div>
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
          <div className="mb-4 flex flex-wrap gap-6">
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
              const balanceClass = !hasData ? "text-base-content/40" : day.balance < 0 ? "text-error" : "text-info";

              return (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => setSelectedDay(day.day)}
                  className="rounded-box border border-base-300 p-1 hover:bg-base-200"
                >
                  <div className="text-xs text-base-content/70">{day.day}</div>
                  {hasData && (
                    <div className={`text-xs font-semibold ${balanceClass}`}>
                      {hideAmounts ? "***" : formatAmount(day.balance)}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {selected && (
            <TransactionList
              title={`${selected.day}日`}
              transactions={selected.transactions}
              onClose={() => setSelectedDay(null)}
              hideAmounts={hideAmounts}
            />
          )}
        </>
      )}
    </div>
  );
}
