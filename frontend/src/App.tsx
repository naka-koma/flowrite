import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import logoUrl from "./assets/favicon-32.png";
import { UploadModal } from "./components/UploadModal";
import { SettingsScreen } from "./components/SettingsScreen";
import { ReportScreen } from "./components/ReportScreen";
import { TransactionScreen } from "./components/TransactionScreen";
import { BudgetScreen } from "./components/BudgetScreen";
import { AiScreen } from "./components/AiScreen";
import { LoadingScreen } from "./components/LoadingScreen";
import { THEMES, type Theme } from "./hooks/useTheme";
import { useAmountVisibility } from "./hooks/useAmountVisibility";
import { usePreferences } from "./hooks/usePreferences";

export function App() {
  const [screen, setScreen] = useState<"report" | "settings" | "transactions" | "budget" | "ai">("report");
  const [menuOpen, setMenuOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const {
    status: preferencesStatus,
    theme,
    setTheme,
    trendVisibleCount,
    setTrendVisibleCount,
  } = usePreferences();
  const { hideAmounts, toggleHideAmounts } = useAmountVisibility();

  if (preferencesStatus === "loading") {
    return <LoadingScreen />;
  }

  function navigate(next: "report" | "settings" | "transactions" | "budget" | "ai") {
    setScreen(next);
    setMenuOpen(false);
  }

  function openUpload() {
    setUploadOpen(true);
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
              onBack={() => navigate("report")}
            />
          ) : screen === "transactions" ? (
            <TransactionScreen hideAmounts={hideAmounts} onBack={() => navigate("report")} />
          ) : screen === "budget" ? (
            <BudgetScreen hideAmounts={hideAmounts} onBack={() => navigate("report")} />
          ) : screen === "ai" ? (
            <AiScreen hideAmounts={hideAmounts} onBack={() => navigate("report")} />
          ) : (
            <ReportScreen hideAmounts={hideAmounts} trendVisibleCount={trendVisibleCount} />
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
            <button type="button" onClick={() => navigate("ai")}>
              AI
            </button>
          </li>
          <li>
            <button type="button" onClick={openUpload}>
              CSVアップロード
            </button>
          </li>
          <li>
            <button type="button" onClick={() => navigate("settings")}>
              設定
            </button>
          </li>
        </ul>
      </div>

      {uploadOpen && <UploadModal onClose={() => setUploadOpen(false)} />}
    </div>
  );
}
