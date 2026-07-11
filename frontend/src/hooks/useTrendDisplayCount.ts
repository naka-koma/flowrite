import { useEffect, useState } from "react";

const STORAGE_KEY = "flowrite-trend-visible-count";
export const DEFAULT_TREND_VISIBLE_COUNT = 12;
export const MIN_TREND_VISIBLE_COUNT = 3;
export const MAX_TREND_VISIBLE_COUNT = 60;

function clamp(value: number): number {
  return Math.min(MAX_TREND_VISIBLE_COUNT, Math.max(MIN_TREND_VISIBLE_COUNT, value));
}

function readStoredCount(): number {
  const stored = Number(localStorage.getItem(STORAGE_KEY));
  return Number.isInteger(stored) && stored > 0 ? clamp(stored) : DEFAULT_TREND_VISIBLE_COUNT;
}

export function useTrendDisplayCount() {
  const [visibleCount, setVisibleCountState] = useState<number>(readStoredCount);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(visibleCount));
  }, [visibleCount]);

  return { visibleCount, setVisibleCount: (value: number) => setVisibleCountState(clamp(value)) };
}
