import { useEffect, useState } from "react";
import { useGoals } from "../hooks/useGoals";
import { formatAmount, formatYen } from "../lib/money";
import type { SavingsTargetMode } from "../types/api";

const MODE_LABELS: Record<SavingsTargetMode, string> = { amount: "定額で指定", rate: "率で指定" };

// カンマ・円などを取り除き数値に変換する（入力欄のカンマ区切り表示に対応するため）
function parseAmountInput(value: string): number {
  return Number(value.replace(/[^0-9]/g, ""));
}

interface GoalSettingsProps {
  totalBudget: number;
  fixedBudget: number;
  hideAmounts: boolean;
}

export function GoalSettings({ totalBudget, fixedBudget, hideAmounts }: GoalSettingsProps) {
  const { status, goals, errorMessage, saveState, saveGoals } = useGoals();
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [mode, setMode] = useState<SavingsTargetMode>("amount");
  const [savingsTargetAmount, setSavingsTargetAmount] = useState("");
  const [savingsTargetRate, setSavingsTargetRate] = useState("");
  const [specialReserveAmount, setSpecialReserveAmount] = useState("");

  useEffect(() => {
    if (goals) {
      setMonthlyIncome(String(goals.monthlyIncome));
      setMode(goals.savingsTargetMode);
      setSavingsTargetAmount(String(goals.savingsTargetAmount));
      setSavingsTargetRate(String(goals.savingsTargetRate));
      setSpecialReserveAmount(String(goals.specialReserveAmount));
    }
  }, [goals]);

  if (status === "loading") {
    return (
      <p className="flex items-center gap-2">
        <span className="loading loading-spinner loading-sm" />
        読み込み中...
      </p>
    );
  }

  if (status === "error" || !goals) {
    return (
      <p role="alert" className="alert alert-error">
        エラー: {errorMessage}
      </p>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveGoals({
      monthlyIncome: parseAmountInput(monthlyIncome),
      savingsTargetMode: mode,
      savingsTargetAmount: parseAmountInput(savingsTargetAmount),
      savingsTargetRate: Number(savingsTargetRate) || 0,
      specialReserveAmount: parseAmountInput(specialReserveAmount),
    });
  };

  const amountText = (amount: number) => (hideAmounts ? "***" : formatYen(amount));

  // 予算の合計が使える総額に収まっているかが、予算見直しの判断材料になる
  const difference = goals.spendableTotal - totalBudget;
  const isConfigured = goals.monthlyIncome > 0;
  const isOverspent = difference < 0;

  return (
    <div className="flex flex-col gap-4" data-testid="goal-settings">
      {isConfigured && (
        <dl className="flex flex-col gap-1 rounded-box border border-base-300 p-3 text-sm">
          <div className="flex justify-between">
            <dt>定期収入（手取り）</dt>
            <dd>{amountText(goals.monthlyIncome)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>目標貯蓄額</dt>
            <dd>{amountText(goals.resolvedSavingsTarget)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>特別費積立</dt>
            <dd>{amountText(goals.specialReserveAmount)}</dd>
          </div>
          <div className="flex justify-between font-medium">
            <dt>使える総額</dt>
            <dd data-testid="spendable-total">{amountText(goals.spendableTotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>予算の合計</dt>
            <dd>{amountText(totalBudget)}</dd>
          </div>
          {totalBudget > 0 && (
            <div className="flex justify-between text-xs text-base-content/70" data-testid="budget-cost-type-breakdown">
              <dt>うち固定費 / 変動費</dt>
              <dd>
                {amountText(fixedBudget)} / {amountText(totalBudget - fixedBudget)}
              </dd>
            </div>
          )}
          <div
            className={`flex justify-between font-medium ${isOverspent ? "text-error" : "text-success"}`}
            data-testid="budget-difference"
          >
            <dt>{isOverspent ? "超過" : "残り"}</dt>
            <dd>{amountText(difference)}</dd>
          </div>
        </dl>
      )}

      {isConfigured && isOverspent && (
        <p role="alert" className="alert alert-warning">
          予算の合計が使える総額を{amountText(Math.abs(difference))}超えています。目標を達成するには予算の見直しが必要です。
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">定期収入（手取り月額）</span>
          <input
            type="text"
            inputMode="numeric"
            aria-label="定期収入（手取り月額）"
            value={monthlyIncome === "0" ? "" : formatAmount(parseAmountInput(monthlyIncome))}
            onChange={(e) => setMonthlyIncome(String(parseAmountInput(e.target.value)))}
            placeholder="例: 280,000"
            className="input input-bordered input-sm w-40"
          />
          <span className="text-xs text-base-content/70">
            口座への振込額（手取り）を入力してください。ボーナスは含めません
          </span>
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">貯蓄目標</span>
          <div role="tablist" className="tabs tabs-boxed w-fit">
            {(Object.keys(MODE_LABELS) as SavingsTargetMode[]).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                className={`tab ${mode === m ? "tab-active" : ""}`}
                onClick={() => setMode(m)}
              >
                {MODE_LABELS[m]}
              </button>
            ))}
          </div>

          {mode === "amount" ? (
            <label className="flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                aria-label="目標貯蓄額"
                value={savingsTargetAmount === "0" ? "" : formatAmount(parseAmountInput(savingsTargetAmount))}
                onChange={(e) => setSavingsTargetAmount(String(parseAmountInput(e.target.value)))}
                placeholder="例: 50,000"
                className="input input-bordered input-sm w-40"
              />
              <span className="text-sm">円 / 月</span>
            </label>
          ) : (
            <label className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={100}
                aria-label="目標貯蓄率"
                value={savingsTargetRate === "0" ? "" : savingsTargetRate}
                onChange={(e) => setSavingsTargetRate(e.target.value)}
                placeholder="例: 20"
                className="input input-bordered input-sm w-24"
              />
              <span className="text-sm">% / 月</span>
            </label>
          )}
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">特別費積立（月額）</span>
          <input
            type="text"
            inputMode="numeric"
            aria-label="特別費積立"
            value={specialReserveAmount === "0" ? "" : formatAmount(parseAmountInput(specialReserveAmount))}
            onChange={(e) => setSpecialReserveAmount(String(parseAmountInput(e.target.value)))}
            placeholder="例: 15,000"
            className="input input-bordered input-sm w-40"
          />
          <span className="text-xs text-base-content/70">
            帰省・イベント・年払いなど、毎月は発生しない支出に備える積立額です
          </span>
        </label>

        <div>
          <button type="submit" disabled={saveState.status === "loading"} className="btn btn-primary btn-sm">
            {saveState.status === "loading" && <span className="loading loading-spinner loading-xs" />}
            保存
          </button>
        </div>

        {saveState.status === "success" && <p className="text-success">保存しました</p>}
        {saveState.status === "error" && (
          <p role="alert" className="alert alert-error">
            エラー: {saveState.errorMessage}
          </p>
        )}
      </form>
    </div>
  );
}
