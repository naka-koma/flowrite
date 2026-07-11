import { MAX_TREND_VISIBLE_COUNT, MIN_TREND_VISIBLE_COUNT } from "../hooks/useTrendDisplayCount";

interface TrendDisplayCountSettingProps {
  visibleCount: number;
  onChange: (value: number) => void;
}

export function TrendDisplayCountSetting({ visibleCount, onChange }: TrendDisplayCountSettingProps) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium">トレンドチャートの表示件数</span>
      <div className="flex items-center gap-3">
        <input
          aria-label="トレンドチャートの表示件数"
          type="number"
          min={MIN_TREND_VISIBLE_COUNT}
          max={MAX_TREND_VISIBLE_COUNT}
          value={visibleCount}
          onChange={(e) => onChange(Number(e.target.value))}
          className="input input-bordered w-24"
        />
        <span className="text-sm text-base-content/70">件（超える分は横スクロールで確認）</span>
      </div>
    </label>
  );
}
