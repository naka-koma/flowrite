import { useEffect, useRef } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrendResponse } from "../types/api";
import { formatYen } from "../lib/money";

interface TrendChartProps {
  data: TrendResponse | null;
  errorMessage: string | null;
  isLoading: boolean;
  hideAmounts: boolean;
  visibleCount: number;
}

const EXPENSE_COLOR = "#e34948";
const INCOME_COLOR = "#2a78d6";

const PX_PER_POINT = 56;

export function TrendChart({ data, errorMessage, isLoading, hideAmounts, visibleCount }: TrendChartProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const points = data?.points ?? [];
  const shouldScroll = points.length > visibleCount;

  useEffect(() => {
    if (shouldScroll && scrollRef.current) {
      // 直近のデータが見えるよう、初期表示は右端（最新）にスクロールしておく
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [shouldScroll, points.length, data?.unit]);

  if (isLoading) {
    return (
      <p className="flex items-center gap-2">
        <span className="loading loading-spinner loading-sm" />
        読み込み中...
      </p>
    );
  }

  if (errorMessage) {
    return (
      <p role="alert" className="alert alert-error">
        エラー: {errorMessage}
      </p>
    );
  }

  if (!data || points.length === 0) {
    return <p className="text-base-content/70">トレンドデータはありません</p>;
  }

  const chartData = points.map((p) => ({
    label: p.label,
    支出: p.totalExpense,
    収入: p.totalIncome,
  }));

  return (
    <div ref={scrollRef} data-testid="trend-scroll-container" className="overflow-x-auto">
      <div style={{ width: shouldScroll ? `${points.length * PX_PER_POINT}px` : "100%", height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis hide={hideAmounts} />
            <Tooltip formatter={(value: number) => (hideAmounts ? "***円" : formatYen(value))} />
            <Legend />
            <Line type="monotone" dataKey="支出" stroke={EXPENSE_COLOR} strokeWidth={2} />
            <Line type="monotone" dataKey="収入" stroke={INCOME_COLOR} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
