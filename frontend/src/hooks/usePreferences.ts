import { useEffect, useState } from "react";
import type { PreferenceKey, PreferencesResponse, UpdatePreferenceResponse } from "../types/api";
import { runScript } from "../lib/googleScriptRun";
import { DEFAULT_THEME, isTheme, type Theme } from "./useTheme";
import { DEFAULT_TREND_VISIBLE_COUNT, clampTrendVisibleCount } from "./useTrendDisplayCount";

type PreferencesStatus = "loading" | "ready";

function parseTheme(raw: string): Theme {
  return isTheme(raw) ? raw : DEFAULT_THEME;
}

function parseTrendVisibleCount(raw: string): number {
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? clampTrendVisibleCount(value) : DEFAULT_TREND_VISIBLE_COUNT;
}

// 保存に失敗してもUI操作はブロックしない（次回読み込み時に反映されないだけ）
function persist(key: PreferenceKey, value: string) {
  runScript<UpdatePreferenceResponse>("handleUpdatePreference", { key, value }).catch(() => {
    // 失敗は無視する
  });
}

export function usePreferences() {
  const [status, setStatus] = useState<PreferencesStatus>("loading");
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME);
  const [trendVisibleCount, setTrendVisibleCountState] = useState<number>(DEFAULT_TREND_VISIBLE_COUNT);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    let cancelled = false;

    runScript<PreferencesResponse>("handleGetPreferences")
      .then((data) => {
        if (cancelled) return;
        setThemeState(parseTheme(data.theme));
        setTrendVisibleCountState(parseTrendVisibleCount(data.trendVisibleCount));
        setStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        // 取得に失敗してもデフォルト値でアプリを表示する
        setStatus("ready");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const setTheme = (next: Theme) => {
    setThemeState(next);
    persist("theme", next);
  };

  const setTrendVisibleCount = (value: number) => {
    const clamped = clampTrendVisibleCount(value);
    setTrendVisibleCountState(clamped);
    persist("trendVisibleCount", String(clamped));
  };

  return {
    status,
    theme,
    setTheme,
    trendVisibleCount,
    setTrendVisibleCount,
  };
}
