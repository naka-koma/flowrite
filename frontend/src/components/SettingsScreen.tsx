import type { Theme } from "../hooks/useTheme";
import type { DashboardSection, DashboardSectionId } from "../hooks/useDashboardLayout";
import { ThemeSelector } from "./ThemeSelector";
import { SettingsForm } from "./SettingsForm";
import { AdminSection } from "./AdminSection";
import { TrendDisplayCountSetting } from "./TrendDisplayCountSetting";
import { DashboardLayoutSettings } from "./DashboardLayoutSettings";
import { CategorySettings } from "./CategorySettings";
import { AiAttributesSettings } from "./AiAttributesSettings";
import { VersionInfo } from "./VersionInfo";
import { PageHeader } from "./PageHeader";
import { SectionCard } from "./SectionCard";

interface SettingsScreenProps {
  theme: Theme;
  onChangeTheme: (theme: Theme) => void;
  trendVisibleCount: number;
  onChangeTrendVisibleCount: (value: number) => void;
  dashboardSections: DashboardSection[];
  onToggleDashboardSection: (id: DashboardSectionId) => void;
  onMoveDashboardSection: (id: DashboardSectionId, direction: "up" | "down") => void;
  onReorderDashboardSections: (activeId: DashboardSectionId, overId: DashboardSectionId) => void;
  onResetDashboardLayout: () => void;
  onBack: () => void;
}

export function SettingsScreen({
  theme,
  onChangeTheme,
  trendVisibleCount,
  onChangeTrendVisibleCount,
  dashboardSections,
  onToggleDashboardSection,
  onMoveDashboardSection,
  onReorderDashboardSections,
  onResetDashboardLayout,
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

      <SectionCard title="ホーム画面">
        <DashboardLayoutSettings
          sections={dashboardSections}
          onToggleVisibility={onToggleDashboardSection}
          onMoveSection={onMoveDashboardSection}
          onReorderSections={onReorderDashboardSections}
          onReset={onResetDashboardLayout}
        />
      </SectionCard>

      <SectionCard title="カテゴリ">
        <CategorySettings />
      </SectionCard>

      <SectionCard title="ユーザー属性情報">
        <AiAttributesSettings />
      </SectionCard>

      <SectionCard title="AI設定">
        <SettingsForm />
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
