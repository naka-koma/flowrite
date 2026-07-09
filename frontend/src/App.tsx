import { useState } from "react";
import { UploadForm } from "./components/UploadForm";
import { MonthSelector } from "./components/MonthSelector";
import { SummaryTable } from "./components/SummaryTable";
import { TrendChart } from "./components/TrendChart";
import { AiAdvice } from "./components/AiAdvice";
import { useSummary } from "./hooks/useSummary";
import { useTrend } from "./hooks/useTrend";

function buildAiContext(
  summary: ReturnType<typeof useSummary>,
  trend: ReturnType<typeof useTrend>,
): string {
  const parts: string[] = [];

  const hasSummaryData =
    summary.data &&
    (summary.data.categories.length > 0 || summary.data.totalExpense > 0 || summary.data.totalIncome > 0);

  if (hasSummaryData && summary.data) {
    const categoryText = summary.data.categories
      .map((c) => `${c.name}: ${c.total}円`)
      .join("、");
    parts.push(
      `${summary.data.year}年${summary.data.month}月: 支出${summary.data.totalExpense}円、収入${summary.data.totalIncome}円${categoryText ? `（内訳: ${categoryText}）` : ""}`,
    );
  }

  if (trend.data && trend.data.months.length > 0) {
    const monthsText = trend.data.months
      .map((m) => `${m.year}/${m.month} 支出${m.totalExpense}円・収入${m.totalIncome}円`)
      .join("、");
    parts.push(`月次推移: ${monthsText}`);
  }

  return parts.join("\n");
}

export function App() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const summary = useSummary(year, month);
  const trend = useTrend();

  return (
    <div>
      <h1>flowrite</h1>
      <p>家計管理ダッシュボード</p>
      <UploadForm />
      <MonthSelector
        year={year}
        month={month}
        onChange={(newYear, newMonth) => {
          setYear(newYear);
          setMonth(newMonth);
        }}
      />
      <SummaryTable
        data={summary.data}
        errorMessage={summary.errorMessage}
        isLoading={summary.status === "loading"}
      />
      <TrendChart
        data={trend.data}
        errorMessage={trend.errorMessage}
        isLoading={trend.status === "loading"}
      />
      <AiAdvice context={buildAiContext(summary, trend)} />
    </div>
  );
}
