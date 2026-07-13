import { useState } from "react";
import { MonthSelector } from "./MonthSelector";
import { YearSelector } from "./YearSelector";
import { useSummary } from "../hooks/useSummary";
import { useAiAdvice } from "../hooks/useAiAdvice";
import { formatYen, maskYenAmounts } from "../lib/money";
import type { SummaryParams } from "../types/api";

type AiPeriodUnit = "month" | "year" | "all";

const UNIT_LABELS: Record<AiPeriodUnit, string> = { month: "月", year: "年", all: "全て" };

interface AiAdviceProps {
  hideAmounts: boolean;
}

function buildContext(summary: ReturnType<typeof useSummary>): string {
  if (!summary.data) return "";

  const hasData =
    summary.data.categories.length > 0 || summary.data.totalExpense > 0 || summary.data.totalIncome > 0;
  if (!hasData) return "";

  const categoryText = summary.data.categories.map((c) => `${c.name}: ${formatYen(c.total)}`).join("、");
  return `${summary.data.label}: 支出${formatYen(summary.data.totalExpense)}、収入${formatYen(summary.data.totalIncome)}${categoryText ? `（内訳: ${categoryText}）` : ""}`;
}

export function AiAdvice({ hideAmounts }: AiAdviceProps) {
  const now = new Date();
  const [unit, setUnit] = useState<AiPeriodUnit>("month");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const summaryParams: SummaryParams =
    unit === "year" ? { unit: "year", year } : unit === "all" ? { unit: "all" } : { unit: "month", year, month };

  const summary = useSummary(summaryParams);
  const { status, advice, errorMessage, fetchAdvice } = useAiAdvice();

  const context = buildContext(summary);

  return (
    <div data-testid="ai-advice">
      <div role="tablist" className="tabs tabs-boxed mb-4 w-fit">
        {(Object.keys(UNIT_LABELS) as AiPeriodUnit[]).map((u) => (
          <button
            key={u}
            type="button"
            role="tab"
            className={`tab ${unit === u ? "tab-active" : ""}`}
            onClick={() => setUnit(u)}
          >
            {UNIT_LABELS[u]}
          </button>
        ))}
      </div>

      {unit === "month" && (
        <MonthSelector
          year={year}
          month={month}
          onChange={(newYear, newMonth) => {
            setYear(newYear);
            setMonth(newMonth);
          }}
          selectLabel="AIアドバイス対象年月"
          prevLabel="AIアドバイス前の月"
          nextLabel="AIアドバイス次の月"
        />
      )}
      {unit === "year" && (
        <YearSelector
          year={year}
          onChange={setYear}
          selectLabel="AIアドバイス対象年"
          prevLabel="AIアドバイス前の年"
          nextLabel="AIアドバイス次の年"
        />
      )}

      <button
        onClick={() => fetchAdvice(context)}
        disabled={status === "loading" || summary.status === "loading"}
        className="btn btn-primary mt-2"
      >
        {status === "loading" && <span className="loading loading-spinner loading-sm" />}
        AIアドバイスを取得
      </button>
      {status === "loading" && <p className="mt-2 text-sm text-base-content/70">読み込み中...</p>}
      {status === "error" && (
        <p role="alert" className="alert alert-error mt-3">
          エラー: {errorMessage}
        </p>
      )}
      {status === "success" && (
        <p className="mt-3 whitespace-pre-wrap">{hideAmounts ? maskYenAmounts(advice ?? "") : advice}</p>
      )}
    </div>
  );
}
