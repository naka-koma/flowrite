export type RgbColor = [number, number, number];

// data-theme切り替え後のCSS変数（oklch等）をブラウザに解決させ、0〜1のRGBとして取得する。
// カラースペースをここでハードコードせず、常に現在のテーマの実際の色に追従させるための実装
function resolveCssVarColor(varName: string): RgbColor {
  const probe = document.createElement("span");
  probe.style.display = "none";
  probe.style.color = `var(${varName})`;
  document.body.appendChild(probe);
  const computed = getComputedStyle(probe).color;
  document.body.removeChild(probe);

  const match = computed.match(/[\d.]+/g);
  if (!match || match.length < 3) {
    return [0, 0, 0];
  }
  return [Number(match[0]) / 255, Number(match[1]) / 255, Number(match[2]) / 255];
}

export interface ThemeShaderColors {
  primary: RgbColor;
  secondary: RgbColor;
  accent: RgbColor;
  base: RgbColor;
}

export function resolveThemeShaderColors(): ThemeShaderColors {
  return {
    primary: resolveCssVarColor("--color-primary"),
    secondary: resolveCssVarColor("--color-secondary"),
    accent: resolveCssVarColor("--color-accent"),
    base: resolveCssVarColor("--color-base-200"),
  };
}
