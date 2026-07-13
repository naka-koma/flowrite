export const DEFAULT_TREND_VISIBLE_COUNT = 12;
export const MIN_TREND_VISIBLE_COUNT = 3;
export const MAX_TREND_VISIBLE_COUNT = 60;

export function clampTrendVisibleCount(value: number): number {
  return Math.min(MAX_TREND_VISIBLE_COUNT, Math.max(MIN_TREND_VISIBLE_COUNT, value));
}
