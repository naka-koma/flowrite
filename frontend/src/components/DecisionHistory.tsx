import { useDecisions } from "../hooks/useDecisions";
import { formatAmount } from "../lib/money";
import type { Decision, TodoActionType } from "../types/api";

const TYPE_LABELS: Record<TodoActionType, string> = {
  budget: "カテゴリ予算",
  savingsTarget: "目標貯蓄額",
  specialReserve: "特別費積立",
};

function formatChangedAt(changedAt: string): string {
  const date = new Date(changedAt);
  if (Number.isNaN(date.getTime())) {
    return changedAt;
  }
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}

interface DecisionHistoryProps {
  hideAmounts: boolean;
  // 予算・目標が変更されたら値が進み、履歴を取り直す
  version: number;
}

export function DecisionHistory({ hideAmounts, version }: DecisionHistoryProps) {
  const { status, decisions, errorMessage } = useDecisions(version);

  const amountText = (amount: number) => (hideAmounts ? "***" : `${formatAmount(amount)}円`);

  // type=budgetは大項目名、それ以外は種別名そのものが対象を表す
  const targetLabel = (decision: Decision) =>
    decision.type === "budget" ? decision.target : TYPE_LABELS[decision.type];

  if (status === "loading") {
    return (
      <p className="flex items-center gap-2">
        <span className="loading loading-spinner loading-sm" />
        読み込み中...
      </p>
    );
  }

  if (status === "error") {
    return (
      <p role="alert" className="alert alert-error">
        エラー: {errorMessage}
      </p>
    );
  }

  if (decisions.length === 0) {
    return <p className="text-base-content/70">まだ変更履歴はありません</p>;
  }

  return (
    <ul className="flex flex-col gap-2" data-testid="decision-history">
      {decisions.map((decision) => (
        <li key={decision.id} className="flex flex-col gap-0.5 rounded-box border border-base-300 p-2 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base-content/60">{formatChangedAt(decision.changedAt)}</span>
            <span className="font-medium">{targetLabel(decision)}</span>
            <span>
              {/* 新規設定時は変更前が存在しない */}
              {decision.beforeAmount === null ? "新規" : amountText(decision.beforeAmount)}
              {" → "}
              {amountText(decision.afterAmount)}
            </span>
            {decision.source === "ai" && <span className="badge badge-ghost badge-sm">AI提案</span>}
          </div>
          {decision.reason && <p className="text-xs text-base-content/70">{decision.reason}</p>}
        </li>
      ))}
    </ul>
  );
}
