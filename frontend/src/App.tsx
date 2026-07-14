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
import { ReportScreen } from "./components/ReportScreen";
import { TransactionScreen } from "./components/TransactionScreen";
import { BudgetScreen } from "./components/BudgetScreen";
import { LoadingScreen } from "./components/LoadingScreen";
import { useSummary } from "./hooks/useSummary";
import { useTrend } from "./hooks/useTrend";
import { THEMES, type Theme } from "./hooks/useTheme";
import { useAmountVisibility } from "./hooks/useAmountVisibility";
import { usePreferences } from "./hooks/usePreferences";
import type { DashboardSectionId } from "./hooks/useDashboardLayout";
import { formatISODate, getMondayOfWeek } from "./lib/week";
import { SECTION_HEADING_CLASS } from "./lib/ui";
import type { SummaryParams, SummaryUnit } from "./types/api";

const DASHBOARD_UNITS: SummaryUnit[] = ["month", "year", "week"];
const UNIT_LABELS: Record<SummaryUnit, string> = { month: "月", year: "年", week: "週", all: "全期間" };

export function App() {
  const now = new Date();
  const [screen, setScreen] = useState<"dashboard" | "settings" | "report" | "transactions" | "budget">("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const {
    status: preferencesStatus,
    theme,
    setTheme,
    dashboardSections,
    toggleDashboardSection,
    moveDashboardSection,
    reorderDashboardSections,
    resetDashboardLayout,
    trendVisibleCount,
    setTrendVisibleCount,
  } = usePreferences();
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

  if (preferencesStatus === "loading") {
    return <LoadingScreen />;
  }

  function navigate(next: "dashboard" | "settings" | "report" | "transactions" | "budget") {
    setScreen(next);
    setMenuOpen(false);
  }

  function renderDashboardSection(id: DashboardSectionId) {
    switch (id) {
      case "upload":
        return (
          <section key={id} className="card bg-base-100">
            <div className="card-body p-4 sm:p-6">
              <UploadForm />
            </div>
          </section>
        );
      case "summary":
        return (
          <section key={id} className="card bg-base-100">
            <div className="card-body p-4 sm:p-6">
              <h2 className={SECTION_HEADING_CLASS}>サマリー</h2>
              <SummaryTable
                data={summary.data}
                errorMessage={summary.errorMessage}
                isLoading={summary.status === "loading"}
                hideAmounts={hideAmounts}
              />
            </div>
          </section>
        );
      case "trend":
        return (
          <section key={id} className="card bg-base-100">
            <div className="card-body p-4 sm:p-6">
              <h2 className={SECTION_HEADING_CLASS}>トレンド</h2>
              <TrendChart
                data={trend.data}
                errorMessage={trend.errorMessage}
                isLoading={trend.status === "loading"}
                hideAmounts={hideAmounts}
                visibleCount={trendVisibleCount}
              />
            </div>
          </section>
        );
      case "aiAdvice":
        return (
          <section key={id} className="card bg-base-100">
            <div className="card-body p-4 sm:p-6">
              <h2 className={SECTION_HEADING_CLASS}>AIアドバイス</h2>
              <AiAdvice hideAmounts={hideAmounts} />
            </div>
          </section>
        );
      default:
        return null;
    }
  }

  const visibleDashboardSections = dashboardSections.filter((s) => s.visible);

  return (
    <div className="drawer lg:drawer-open">
      <input
        id="app-drawer"
        type="checkbox"
        className="drawer-toggle"
        checked={menuOpen}
        onChange={(e) => setMenuOpen(e.target.checked)}
      />
      <div className="drawer-content min-h-screen">
        <header className="glass-surface sticky top-0 z-30 flex items-center gap-3 px-4 py-2">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="メニューを開く"
            className="btn btn-ghost btn-circle btn-sm lg:hidden"
          >
            ☰
          </button>

          <div className="ml-auto flex items-center gap-2">
            <select
              aria-label="テーマ"
              value={theme}
              onChange={(e) => setTheme(e.target.value as Theme)}
              className="select select-bordered select-sm"
            >
              <optgroup label="ライトテーマ">
                {THEMES.filter((t) => t.mode === "light").map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="ダークテーマ">
                {THEMES.filter((t) => t.mode === "dark").map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </optgroup>
            </select>
            <button
              type="button"
              onClick={toggleHideAmounts}
              aria-label={hideAmounts ? "金額を表示する" : "金額を隠す"}
              aria-pressed={hideAmounts}
              className="btn btn-ghost btn-circle"
            >
              {hideAmounts ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </header>

        <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
          {screen === "settings" ? (
            <SettingsScreen
              theme={theme}
              onChangeTheme={setTheme}
              trendVisibleCount={trendVisibleCount}
              onChangeTrendVisibleCount={setTrendVisibleCount}
              dashboardSections={dashboardSections}
              onToggleDashboardSection={toggleDashboardSection}
              onMoveDashboardSection={moveDashboardSection}
              onReorderDashboardSections={reorderDashboardSections}
              onResetDashboardLayout={resetDashboardLayout}
              onBack={() => navigate("dashboard")}
            />
          ) : screen === "report" ? (
            <ReportScreen
              hideAmounts={hideAmounts}
              trendVisibleCount={trendVisibleCount}
              onBack={() => navigate("dashboard")}
            />
          ) : screen === "transactions" ? (
            <TransactionScreen hideAmounts={hideAmounts} onBack={() => navigate("dashboard")} />
          ) : screen === "budget" ? (
            <BudgetScreen onBack={() => navigate("dashboard")} />
          ) : (
            <div className="flex flex-col gap-6">
              <section className="card bg-base-100" data-testid="period-selector">
                <div className="card-body p-4 sm:p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold">期間</h2>
                    <select
                      aria-label="期間の単位"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value as SummaryUnit)}
                      className="select select-bordered select-sm"
                    >
                      {DASHBOARD_UNITS.map((u) => (
                        <option key={u} value={u}>
                          {UNIT_LABELS[u]}
                        </option>
                      ))}
                    </select>

                    {unit === "month" && (
                      <MonthSelector
                        year={year}
                        month={month}
                        onChange={(newYear, newMonth) => {
                          setYear(newYear);
                          setMonth(newMonth);
                        }}
                        compact
                      />
                    )}
                    {unit === "year" && <YearSelector year={summaryYear} onChange={setSummaryYear} compact />}
                    {unit === "week" && <WeekSelector weekStart={weekStart} onChange={setWeekStart} compact />}
                  </div>
                </div>
              </section>

              {visibleDashboardSections.length === 0 ? (
                <p className="text-base-content/70">
                  表示するセクションがありません。設定画面の「ホーム画面」から表示するセクションを選んでください。
                </p>
              ) : (
                visibleDashboardSections.map((section) => renderDashboardSection(section.id))
              )}
            </div>
          )}
        </div>
      </div>

      <div className="drawer-side z-50">
        <label htmlFor="app-drawer" aria-label="メニューを閉じる" className="drawer-overlay"></label>
        <ul className="menu min-h-full w-64 gap-1 bg-base-100 p-4 text-base-content lg:border-r-0">
          <li className="mb-2">
            <div className="flex items-center gap-2 px-2 py-1">
              <img src={logoUrl} alt="" className="h-7 w-7 rounded" />
              <h1 className="text-xl font-bold">flowrite</h1>
            </div>
          </li>
          <li>
            <button type="button" onClick={() => navigate("dashboard")}>
              ホーム
            </button>
          </li>
          <li>
            <button type="button" onClick={() => navigate("report")}>
              レポート
            </button>
          </li>
          <li>
            <button type="button" onClick={() => navigate("transactions")}>
              取引一覧
            </button>
          </li>
          <li>
            <button type="button" onClick={() => navigate("budget")}>
              予算
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
