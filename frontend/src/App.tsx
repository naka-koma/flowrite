import { useState } from "react";
import { UploadForm } from "./components/UploadForm";
import { MonthSelector } from "./components/MonthSelector";
import { YearSelector } from "./components/YearSelector";
import { WeekSelector } from "./components/WeekSelector";
import { SummaryTable } from "./components/SummaryTable";
import { TrendChart } from "./components/TrendChart";
import { AiAdvice } from "./components/AiAdvice";
import { SettingsScreen } from "./components/SettingsScreen";
import { useSummary } from "./hooks/useSummary";
import { useTrend } from "./hooks/useTrend";
import { useTheme } from "./hooks/useTheme";
import { formatISODate, getMondayOfWeek } from "./lib/week";
import type { SummaryParams, SummaryUnit } from "./types/api";

function buildAiContext(
  summary: ReturnType<typeof useSummary>,
  trend: ReturnType<typeof useTrend>,
): string {
  const parts: string[] = [];

  const hasSummaryData =
    summary.data &&
    (summary.data.categories.length > 0 || summary.data.totalExpense > 0 || summary.data.totalIncome > 0);

  if (hasSummaryData && summary.data) {
    const categoryText = summary.data.categories
      .map((c) => `${c.name}: ${c.total}円`)
      .join("、");
    parts.push(
      `${summary.data.label}: 支出${summary.data.totalExpense}円、収入${summary.data.totalIncome}円${categoryText ? `（内訳: ${categoryText}）` : ""}`,
    );
  }

  if (trend.data && trend.data.months.length > 0) {
    const monthsText = trend.data.months
      .map((m) => `${m.year}/${m.month} 支出${m.totalExpense}円・収入${m.totalIncome}円`)
      .join("、");
    parts.push(`月次推移: ${monthsText}`);
  }

  return parts.join("\n");
}

const UNIT_LABELS: Record<SummaryUnit, string> = { month: "月", year: "年", week: "週" };

export function App() {
  const now = new Date();
  const [screen, setScreen] = useState<"dashboard" | "settings">("dashboard");
  const { theme, setTheme } = useTheme();
  const [unit, setUnit] = useState<SummaryUnit>("month");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [summaryYear, setSummaryYear] = useState(now.getFullYear());
  const [weekStart, setWeekStart] = useState(formatISODate(getMondayOfWeek(now)));

  const summaryParams: SummaryParams =
    unit === "year"
      ? { unit: "year", year: summaryYear }
      : unit === "week"
        ? { unit: "week", weekStart }
        : { unit: "month", year, month };

  const summary = useSummary(summaryParams);
  const trend = useTrend();

  if (screen === "settings") {
    return (
      <div className="min-h-screen bg-base-200">
        <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
          <SettingsScreen theme={theme} onChangeTheme={setTheme} onBack={() => setScreen("dashboard")} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
        <header className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">flowrite</h1>
            <p className="text-base-content/70">家計管理ダッシュボード</p>
          </div>
          <button
            type="button"
            onClick={() => setScreen("settings")}
            aria-label="設定を開く"
            className="btn btn-ghost btn-circle"
          >
            ⚙
          </button>
        </header>

        <div className="flex flex-col gap-6">
          <section className="card bg-base-100 shadow-sm">
            <div className="card-body p-4 sm:p-6">
              <UploadForm />
            </div>
          </section>

          <section className="card bg-base-100 shadow-sm">
            <div className="card-body p-4 sm:p-6">
              <h2 className="mb-3 text-lg font-semibold">サマリー</h2>

              <div role="tablist" className="tabs tabs-boxed mb-4 w-fit">
                {(Object.keys(UNIT_LABELS) as SummaryUnit[]).map((u) => (
                  <button
                    key={u}
                    type="button"
                    role="tab"
                    className={`tab ${unit === u ? "tab-active" : ""}`}
                    onClick={() => setUnit(u)}
                  >
                    {UNIT_LABELS[u]}
                  </button>
                ))}
              </div>

              {unit === "month" && (
                <MonthSelector
                  year={year}
                  month={month}
                  onChange={(newYear, newMonth) => {
                    setYear(newYear);
                    setMonth(newMonth);
                  }}
                />
              )}
              {unit === "year" && <YearSelector year={summaryYear} onChange={setSummaryYear} />}
              {unit === "week" && <WeekSelector weekStart={weekStart} onChange={setWeekStart} />}

              <SummaryTable
                data={summary.data}
                errorMessage={summary.errorMessage}
                isLoading={summary.status === "loading"}
              />
            </div>
          </section>

          <section className="card bg-base-100 shadow-sm">
            <div className="card-body p-4 sm:p-6">
              <h2 className="mb-3 text-lg font-semibold">トレンド</h2>
              <TrendChart
                data={trend.data}
                errorMessage={trend.errorMessage}
                isLoading={trend.status === "loading"}
              />
            </div>
          </section>

          <section className="card bg-base-100 shadow-sm">
            <div className="card-body p-4 sm:p-6">
              <h2 className="mb-3 text-lg font-semibold">AIアドバイス</h2>
              <AiAdvice context={buildAiContext(summary, trend)} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
