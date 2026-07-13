import { useEffect, useState } from "react";
import type { PreferenceKey, PreferencesResponse, UpdatePreferenceResponse } from "../types/api";
import { runScript } from "../lib/googleScriptRun";
import { DEFAULT_THEME, isTheme, type Theme } from "./useTheme";
import {
  DEFAULT_SECTIONS,
  isValidSection,
  normalizeSections,
  type DashboardSection,
  type DashboardSectionId,
} from "./useDashboardLayout";
import { DEFAULT_TREND_VISIBLE_COUNT, clampTrendVisibleCount } from "./useTrendDisplayCount";

type PreferencesStatus = "loading" | "ready";

function parseTheme(raw: string): Theme {
  return isTheme(raw) ? raw : DEFAULT_THEME;
}

function parseDashboardSections(raw: string): DashboardSection[] {
  if (!raw) return DEFAULT_SECTIONS;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_SECTIONS;

    const valid = parsed.filter(isValidSection);
    if (valid.length === 0) return DEFAULT_SECTIONS;

    return normalizeSections(valid);
  } catch {
    return DEFAULT_SECTIONS;
  }
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
  const [dashboardSections, setDashboardSections] = useState<DashboardSection[]>(DEFAULT_SECTIONS);
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
        setDashboardSections(parseDashboardSections(data.dashboardLayout));
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

  const toggleDashboardSection = (id: DashboardSectionId) => {
    setDashboardSections((prev) => {
      const next = prev.map((s) => (s.id === id ? { ...s, visible: !s.visible } : s));
      persist("dashboardLayout", JSON.stringify(next));
      return next;
    });
  };

  const moveDashboardSection = (id: DashboardSectionId, direction: "up" | "down") => {
    setDashboardSections((prev) => {
      const index = prev.findIndex((s) => s.id === id);
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (index < 0 || targetIndex < 0 || targetIndex >= prev.length) return prev;

      const next = [...prev];
      const current = next[index]!;
      const target = next[targetIndex]!;
      next[index] = target;
      next[targetIndex] = current;
      persist("dashboardLayout", JSON.stringify(next));
      return next;
    });
  };

  const resetDashboardLayout = () => {
    setDashboardSections(DEFAULT_SECTIONS);
    persist("dashboardLayout", JSON.stringify(DEFAULT_SECTIONS));
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
    dashboardSections,
    toggleDashboardSection,
    moveDashboardSection,
    resetDashboardLayout,
    trendVisibleCount,
    setTrendVisibleCount,
  };
}
