import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { CategoryTotal } from "../types/api";
import { formatYen } from "../lib/money";

interface CategoryPieChartProps {
  categories: CategoryTotal[];
  onSelectCategory: (name: string) => void;
  hideAmounts: boolean;
}

// カテゴリー識別用の固定順カテゴリカルパレット（dataviz skill準拠）
const CATEGORY_COLORS = [
  "#2a78d6", // blue
  "#1baf7a", // aqua
  "#eda100", // yellow
  "#008300", // green
  "#4a3aa7", // violet
  "#e34948", // red
  "#e87ba4", // magenta
  "#eb6834", // orange
];
const OTHER_COLOR = "#898781";
const OTHER_LABEL = "その他";
const MAX_SLICES = 7;

interface Slice {
  name: string;
  value: number;
  // 集約された「その他」枠かどうか。実データに同名カテゴリーがあっても区別できるようにフラグで持つ
  isAggregate: boolean;
}

function buildSlices(categories: CategoryTotal[]): Slice[] {
  if (categories.length <= MAX_SLICES + 1) {
    return categories.map((c) => ({ name: c.name, value: c.total, isAggregate: false }));
  }

  // 8色を超える場合は上位7件+「その他」に集約する（生成色は使わない）
  const top = categories.slice(0, MAX_SLICES);
  const rest = categories.slice(MAX_SLICES);
  const otherTotal = rest.reduce((sum, c) => sum + c.total, 0);

  return [
    ...top.map((c) => ({ name: c.name, value: c.total, isAggregate: false })),
    { name: OTHER_LABEL, value: otherTotal, isAggregate: true },
  ];
}

export function CategoryPieChart({ categories, onSelectCategory, hideAmounts }: CategoryPieChartProps) {
  const slices = buildSlices(categories);

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={slices}
          dataKey="value"
          nameKey="name"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          onClick={(entry: Slice) => {
            if (!entry.isAggregate) {
              onSelectCategory(entry.name);
            }
          }}
        >
          {slices.map((slice, index) => (
            <Cell
              key={slice.name}
              fill={slice.isAggregate ? OTHER_COLOR : CATEGORY_COLORS[index]}
              cursor={slice.isAggregate ? "default" : "pointer"}
            />
          ))}
        </Pie>
        <Tooltip formatter={(value: number) => (hideAmounts ? "***円" : formatYen(value))} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
