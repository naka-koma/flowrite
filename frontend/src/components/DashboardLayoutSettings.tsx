import type { DashboardSection, DashboardSectionId } from "../hooks/useDashboardLayout";

const SECTION_LABELS: Record<DashboardSectionId, string> = {
  upload: "CSVアップロード",
  summary: "サマリー",
  trend: "トレンド",
  aiAdvice: "AIアドバイス",
};

interface DashboardLayoutSettingsProps {
  sections: DashboardSection[];
  onToggleVisibility: (id: DashboardSectionId) => void;
  onMoveSection: (id: DashboardSectionId, direction: "up" | "down") => void;
  onReset: () => void;
}

export function DashboardLayoutSettings({
  sections,
  onToggleVisibility,
  onMoveSection,
  onReset,
}: DashboardLayoutSettingsProps) {
  return (
    <div>
      <ul className="flex flex-col gap-2">
        {sections.map((section, index) => {
          const label = SECTION_LABELS[section.id];
          return (
            <li
              key={section.id}
              className="flex items-center gap-2 rounded-box border border-base-300 p-2"
            >
              <div className="flex flex-col">
                <button
                  type="button"
                  aria-label={`${label}を上に移動`}
                  disabled={index === 0}
                  onClick={() => onMoveSection(section.id, "up")}
                  className="btn btn-ghost btn-xs"
                >
                  ▲
                </button>
                <button
                  type="button"
                  aria-label={`${label}を下に移動`}
                  disabled={index === sections.length - 1}
                  onClick={() => onMoveSection(section.id, "down")}
                  className="btn btn-ghost btn-xs"
                >
                  ▼
                </button>
              </div>
              <label className="label flex flex-1 cursor-pointer justify-start gap-2">
                <input
                  type="checkbox"
                  className="toggle toggle-sm"
                  checked={section.visible}
                  onChange={() => onToggleVisibility(section.id)}
                  aria-label={`${label}を表示`}
                />
                <span>{label}</span>
              </label>
            </li>
          );
        })}
      </ul>
      <button type="button" onClick={onReset} className="btn btn-ghost btn-sm mt-3">
        初期状態に戻す
      </button>
    </div>
  );
}
