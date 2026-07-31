import type { Theme } from "../hooks/useTheme";
import { ThemeSelector } from "./ThemeSelector";
import { AdminSection } from "./AdminSection";
import { TrendDisplayCountSetting } from "./TrendDisplayCountSetting";
import { CategorySettings } from "./CategorySettings";
import { VersionInfo } from "./VersionInfo";
import { PageHeader } from "./PageHeader";
import { SectionCard } from "./SectionCard";

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
      <PageHeader title="設定" onBack={onBack} />

      <SectionCard title="テーマ">
        <ThemeSelector theme={theme} onChange={onChangeTheme} />
      </SectionCard>

      <SectionCard title="表示設定">
        <TrendDisplayCountSetting visibleCount={trendVisibleCount} onChange={onChangeTrendVisibleCount} />
      </SectionCard>

      <SectionCard title="カテゴリ">
        <CategorySettings />
      </SectionCard>

      <SectionCard title="管理">
        <AdminSection />
      </SectionCard>

      <SectionCard title="バージョン情報">
        <VersionInfo />
      </SectionCard>
    </div>
  );
}
