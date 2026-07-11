import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import logoUrl from "./assets/favicon-32.png";
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
import { useAmountVisibility } from "./hooks/useAmountVisibility";
import { formatISODate, getMondayOfWeek } from "./lib/week";
import { formatYen } from "./lib/money";
import { SECTION_HEADING_CLASS } from "./lib/ui";
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
      .map((c) => `${c.name}: ${formatYen(c.total)}`)
      .join("、");
    parts.push(
      `${summary.data.label}: 支出${formatYen(summary.data.totalExpense)}、収入${formatYen(summary.data.totalIncome)}${categoryText ? `（内訳: ${categoryText}）` : ""}`,
    );
  }

  if (trend.data && trend.data.points.length > 0) {
    const pointsText = trend.data.points
      .map((p) => `${p.label} 支出${formatYen(p.totalExpense)}・収入${formatYen(p.totalIncome)}`)
      .join("、");
    parts.push(`推移: ${pointsText}`);
  }

  return parts.join("\n");
}

const UNIT_LABELS: Record<SummaryUnit, string> = { month: "月", year: "年", week: "週" };

export function App() {
  const now = new Date();
  const [screen, setScreen] = useState<"dashboard" | "settings">("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const { hideAmounts, toggleHideAmounts } = useAmountVisibility();
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
  const trend = useTrend(unit);

  function navigate(next: "dashboard" | "settings") {
    setScreen(next);
    setMenuOpen(false);
  }

  return (
    <div className="drawer lg:drawer-open">
      <input
        id="app-drawer"
        type="checkbox"
        className="drawer-toggle"
        checked={menuOpen}
        onChange={(e) => setMenuOpen(e.target.checked)}
      />
      <div className="drawer-content min-h-screen bg-base-200">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
          <header className="mb-6 flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-box border border-base-300 bg-base-100 px-3 py-2">
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                aria-label="メニューを開く"
                className="btn btn-ghost btn-circle btn-sm lg:hidden"
              >
                ☰
              </button>
              <img src={logoUrl} alt="" className="h-7 w-7 rounded" />
              <h1 className="text-2xl font-bold sm:text-3xl">flowrite</h1>
            </div>
            <button
              type="button"
              onClick={toggleHideAmounts}
              aria-label={hideAmounts ? "金額を表示する" : "金額を隠す"}
              aria-pressed={hideAmounts}
              className="btn btn-ghost btn-circle ml-auto"
            >
              {hideAmounts ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </header>

          {screen === "settings" ? (
            <SettingsScreen theme={theme} onChangeTheme={setTheme} onBack={() => navigate("dashboard")} />
          ) : (
            <div className="flex flex-col gap-6">
              <section className="card bg-base-100 shadow-sm">
                <div className="card-body p-4 sm:p-6">
                  <UploadForm />
                </div>
              </section>

              <section className="card bg-base-100 shadow-sm">
                <div className="card-body p-4 sm:p-6">
                  <h2 className={SECTION_HEADING_CLASS}>サマリー</h2>

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
                    hideAmounts={hideAmounts}
                  />
                </div>
              </section>

              <section className="card bg-base-100 shadow-sm">
                <div className="card-body p-4 sm:p-6">
                  <h2 className={SECTION_HEADING_CLASS}>トレンド</h2>
                  <TrendChart
                    data={trend.data}
                    errorMessage={trend.errorMessage}
                    isLoading={trend.status === "loading"}
                    hideAmounts={hideAmounts}
                  />
                </div>
              </section>

              <section className="card bg-base-100 shadow-sm">
                <div className="card-body p-4 sm:p-6">
                  <h2 className={SECTION_HEADING_CLASS}>AIアドバイス</h2>
                  <AiAdvice context={buildAiContext(summary, trend)} hideAmounts={hideAmounts} />
                </div>
              </section>
            </div>
          )}
        </div>
      </div>

      <div className="drawer-side z-50">
        <label htmlFor="app-drawer" aria-label="メニューを閉じる" className="drawer-overlay"></label>
        <ul className="menu bg-base-100 min-h-full w-64 gap-1 p-4 text-base-content lg:border-r lg:border-base-300">
          <li>
            <button type="button" onClick={() => navigate("dashboard")}>
              ホーム
            </button>
          </li>
          <li>
            <button type="button" onClick={() => navigate("settings")}>
              設定
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}
