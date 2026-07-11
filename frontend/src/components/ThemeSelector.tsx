import { THEMES, type Theme } from "../hooks/useTheme";

interface ThemeSelectorProps {
  theme: Theme;
  onChange: (theme: Theme) => void;
}

function ThemeGroup({
  title,
  themes,
  selected,
  onChange,
}: {
  title: string;
  themes: typeof THEMES;
  selected: Theme;
  onChange: (theme: Theme) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-base-content/70">{title}</p>
      <div role="radiogroup" aria-label={title} className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {themes.map((t) => (
          <label
            key={t.id}
            className={`flex cursor-pointer items-center gap-2 rounded-box border p-2 ${
              selected === t.id ? "border-primary" : "border-base-300"
            }`}
          >
            <input
              type="radio"
              name="theme"
              className="radio radio-primary radio-sm"
              checked={selected === t.id}
              onChange={() => onChange(t.id)}
            />
            <span className="flex gap-1">
              {t.swatch.map((color, i) => (
                <span
                  key={i}
                  className="h-4 w-4 rounded-full border border-base-300"
                  style={{ backgroundColor: color }}
                />
              ))}
            </span>
            <span className="text-sm">{t.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export function ThemeSelector({ theme, onChange }: ThemeSelectorProps) {
  const lightThemes = THEMES.filter((t) => t.mode === "light");
  const darkThemes = THEMES.filter((t) => t.mode === "dark");

  return (
    <div className="flex flex-col gap-4">
      <ThemeGroup title="ライトテーマ" themes={lightThemes} selected={theme} onChange={onChange} />
      <ThemeGroup title="ダークテーマ" themes={darkThemes} selected={theme} onChange={onChange} />
    </div>
  );
}
