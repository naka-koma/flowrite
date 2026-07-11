import type { Theme } from "../hooks/useTheme";
import { ThemeSelector } from "./ThemeSelector";
import { SettingsForm } from "./SettingsForm";
import { AdminSection } from "./AdminSection";

interface SettingsScreenProps {
  theme: Theme;
  onChangeTheme: (theme: Theme) => void;
  onBack: () => void;
}

export function SettingsScreen({ theme, onChangeTheme, onBack }: SettingsScreenProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <button type="button" onClick={onBack} aria-label="ダッシュボードに戻る" className="btn btn-ghost btn-sm">
          ‹ 戻る
        </button>
        <h1 className="text-xl font-bold">設定</h1>
      </div>

      <section className="card bg-base-100 shadow-sm">
        <div className="card-body p-4 sm:p-6">
          <h2 className="mb-3 text-lg font-semibold">テーマ</h2>
          <ThemeSelector theme={theme} onChange={onChangeTheme} />
        </div>
      </section>

      <section className="card bg-base-100 shadow-sm">
        <div className="card-body p-4 sm:p-6">
          <h2 className="mb-3 text-lg font-semibold">AI設定</h2>
          <SettingsForm />
        </div>
      </section>

      <section className="card bg-base-100 shadow-sm">
        <div className="card-body p-4 sm:p-6">
          <h2 className="mb-3 text-lg font-semibold">管理</h2>
          <AdminSection />
        </div>
      </section>
    </div>
  );
}
