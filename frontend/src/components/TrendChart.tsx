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

interface TrendChartProps {
  data: TrendResponse | null;
  errorMessage: string | null;
  isLoading: boolean;
}

const EXPENSE_COLOR = "#e34948";
const INCOME_COLOR = "#2a78d6";

export function TrendChart({ data, errorMessage, isLoading }: TrendChartProps) {
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

  if (!data || data.months.length === 0) {
    return <p className="text-base-content/70">トレンドデータはありません</p>;
  }

  const chartData = data.months.map((m) => ({
    label: `${m.year}/${m.month}`,
    支出: m.totalExpense,
    収入: m.totalIncome,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="label" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="支出" stroke={EXPENSE_COLOR} strokeWidth={2} />
        <Line type="monotone" dataKey="収入" stroke={INCOME_COLOR} strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}
