import type { Theme } from "../hooks/useTheme";

interface ThemeSelectorProps {
  theme: Theme;
  onChange: (theme: Theme) => void;
}

export function ThemeSelector({ theme, onChange }: ThemeSelectorProps) {
  return (
    <div role="radiogroup" aria-label="テーマ" className="flex gap-3">
      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="radio"
          name="theme"
          className="radio radio-primary"
          checked={theme === "fluorite"}
          onChange={() => onChange("fluorite")}
        />
        ライト（蛍石）
      </label>
      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="radio"
          name="theme"
          className="radio radio-primary"
          checked={theme === "fluorite-dark"}
          onChange={() => onChange("fluorite-dark")}
        />
        ダーク（蛍石）
      </label>
    </div>
  );
}
