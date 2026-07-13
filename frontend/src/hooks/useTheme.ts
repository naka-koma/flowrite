export type Theme = "mint-clarity" | "cool-violet" | "sunny-quartz" | "abyss-green" | "indigo-mystery" | "shadow-sun";

export interface ThemeMeta {
  id: Theme;
  label: string;
  mode: "light" | "dark";
  swatch: [string, string, string];
}

export const THEMES: ThemeMeta[] = [
  { id: "mint-clarity", label: "ミント・クラリティ", mode: "light", swatch: ["#188049", "#8a5fd1", "#5fbe8c"] },
  { id: "cool-violet", label: "クール・バイオレット", mode: "light", swatch: ["#6a5fd1", "#1f7f9e", "#8f7fe8"] },
  { id: "sunny-quartz", label: "サニー・クォーツ", mode: "light", swatch: ["#146f9c", "#d9a63e", "#e8c572"] },
  { id: "abyss-green", label: "ディープ・アビス・グリーン", mode: "dark", swatch: ["#7fdba0", "#256b57", "#c9e6a0"] },
  { id: "indigo-mystery", label: "インディゴ・ミステリー", mode: "dark", swatch: ["#8f99ff", "#b98fff", "#c97a63"] },
  { id: "shadow-sun", label: "シャドウ・サン", mode: "dark", swatch: ["#e8b94a", "#c98a3a", "#f4d37a"] },
];

export const DEFAULT_THEME: Theme = "mint-clarity";

const THEME_IDS = THEMES.map((t) => t.id);

export function isTheme(value: string): value is Theme {
  return (THEME_IDS as string[]).includes(value);
}
