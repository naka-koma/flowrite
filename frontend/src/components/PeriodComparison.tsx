import type { PeriodComparisonEntry } from "../types/api";
import { formatAmount } from "../lib/money";

interface PeriodComparisonProps {
  previousMonth: PeriodComparisonEntry;
  previousYear: PeriodComparisonEntry;
  hideAmounts: boolean;
}

type Favorable = "increase" | "decrease";

function buildDiffText(
  label: string,
  diff: number,
  hideAmounts: boolean,
  favorable: Favorable,
): { text: string; colorClass: string } {
  if (diff === 0) {
    return { text: `${label}は変わっていません`, colorClass: "text-base-content/70" };
  }

  const amountText = hideAmounts ? "***" : formatAmount(Math.abs(diff));
  const isIncrease = diff > 0;
  const direction = isIncrease ? `${amountText}円増えました` : `${amountText}円減りました`;
  const isFavorable = favorable === "increase" ? isIncrease : !isIncrease;

  return {
    text: `${label}が前より${direction}`,
    colorClass: isFavorable ? "text-success" : "text-error",
  };
}

function ComparisonBlock({
  heading,
  entry,
  hideAmounts,
}: {
  heading: string;
  entry: PeriodComparisonEntry;
  hideAmounts: boolean;
}) {
  const rows: { label: string; diff: number; favorable: Favorable }[] = [
    { label: "収入", diff: entry.incomeDiff, favorable: "increase" },
    { label: "支出", diff: entry.expenseDiff, favorable: "decrease" },
    { label: "収支", diff: entry.balanceDiff, favorable: "increase" },
  ];

  return (
    <div>
      <p className="mb-1 text-sm text-base-content/70">{heading}</p>
      <ul className="flex flex-col gap-1 text-sm">
        {rows.map(({ label, diff, favorable }) => {
          const { text, colorClass } = buildDiffText(label, diff, hideAmounts, favorable);
          return (
            <li key={label} className={colorClass}>
              {text}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function PeriodComparison({ previousMonth, previousYear, hideAmounts }: PeriodComparisonProps) {
  return (
    <div className="flex flex-col gap-4">
      <ComparisonBlock
        heading={`前月 (${previousMonth.label}) と比較`}
        entry={previousMonth}
        hideAmounts={hideAmounts}
      />
      <ComparisonBlock
        heading={`前年同月 (${previousYear.label}) と比較`}
        entry={previousYear}
        hideAmounts={hideAmounts}
      />
    </div>
  );
}
