import type { Theme } from "../hooks/useTheme";
import { ThemeSelector } from "./ThemeSelector";
import { SettingsForm } from "./SettingsForm";
import { AdminSection } from "./AdminSection";
import { TrendDisplayCountSetting } from "./TrendDisplayCountSetting";

interface SettingsScreenProps {
  theme: Theme;
  onChangeTheme: (theme: Theme) => void;
  trendVisibleCount: number;
  onChangeTrendVisibleCount: (value: number) => void;
  onBack: () => void;
}

export function SettingsScreen({
  theme,
  onChangeTheme,
  trendVisibleCount,
  onChangeTrendVisibleCount,
  onBack,
}: SettingsScreenProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <button type="button" onClick={onBack} aria-label="ダッシュボードに戻る" className="btn btn-ghost btn-sm">
          ‹ 戻る
        </button>
        <h1 className="text-xl font-bold">設定</h1>
      </div>

      <section className="card bg-base-100">
        <div className="card-body p-4 sm:p-6">
          <h2 className="mb-3 text-lg font-semibold">テーマ</h2>
          <ThemeSelector theme={theme} onChange={onChangeTheme} />
        </div>
      </section>

      <section className="card bg-base-100">
        <div className="card-body p-4 sm:p-6">
          <h2 className="mb-3 text-lg font-semibold">表示設定</h2>
          <TrendDisplayCountSetting visibleCount={trendVisibleCount} onChange={onChangeTrendVisibleCount} />
        </div>
      </section>

      <section className="card bg-base-100">
        <div className="card-body p-4 sm:p-6">
          <h2 className="mb-3 text-lg font-semibold">AI設定</h2>
          <SettingsForm />
        </div>
      </section>

      <section className="card bg-base-100">
        <div className="card-body p-4 sm:p-6">
          <h2 className="mb-3 text-lg font-semibold">管理</h2>
          <AdminSection />
        </div>
      </section>
    </div>
  );
}
