import { useState } from "react";
import { MonthSelector } from "./MonthSelector";
import { YearSelector } from "./YearSelector";
import { useAiChat } from "../hooks/useAiChat";
import { useAiFocusPoints } from "../hooks/useAiFocusPoints";
import { useAiMemories } from "../hooks/useAiMemories";
import { formatAmount, maskYenAmounts } from "../lib/money";
import type { AiFocusPoint, SummaryParams } from "../types/api";

type AiPeriodUnit = "month" | "year" | "all";
type WizardStep = "period" | "focusPoints" | "chat";

const UNIT_LABELS: Record<AiPeriodUnit, string> = { month: "月", year: "年", all: "全て" };

interface AiAdviceProps {
  hideAmounts: boolean;
}

export function AiAdvice({ hideAmounts }: AiAdviceProps) {
  const now = new Date();
  const [step, setStep] = useState<WizardStep>("period");
  const [unit, setUnit] = useState<AiPeriodUnit>("month");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedFocusPoint, setSelectedFocusPoint] = useState<AiFocusPoint | null>(null);
  const [showFreeTextInput, setShowFreeTextInput] = useState(false);
  const [freeText, setFreeText] = useState("");
  const [savedMessageIndices, setSavedMessageIndices] = useState<Set<number>>(new Set());

  const focusPoints = useAiFocusPoints();
  const chat = useAiChat();
  const memories = useAiMemories();

  const summaryParams: SummaryParams =
    unit === "year" ? { unit: "year", year } : unit === "all" ? { unit: "all" } : { unit: "month", year, month };

  const maskText = (text: string) => (hideAmounts ? maskYenAmounts(text) : text);

  const handleFindFocusPoints = () => {
    setStep("focusPoints");
    focusPoints.fetchFocusPoints(summaryParams);
  };

  const handleSelectFocusPoint = (focusPoint: AiFocusPoint) => {
    setSelectedFocusPoint(focusPoint);
    setStep("chat");
    chat.startChat(`${focusPoint.title}: ${focusPoint.context}`, summaryParams);
  };

  const handleReset = () => {
    setStep("period");
    setSelectedFocusPoint(null);
    setShowFreeTextInput(false);
    setFreeText("");
    setSavedMessageIndices(new Set());
    focusPoints.reset();
    chat.reset();
  };

  const handleSendReply = (text: string) => {
    setShowFreeTextInput(false);
    setFreeText("");
    chat.sendReply(text);
  };

  const handleSendFreeText = (e: React.FormEvent) => {
    e.preventDefault();
    const text = freeText.trim();
    if (!text) return;
    handleSendReply(text);
  };

  const handleSaveMemory = async (index: number, text: string) => {
    const ok = await memories.addMemory({ type: "insight", content: text });
    if (ok) {
      setSavedMessageIndices((prev) => new Set(prev).add(index));
    }
  };

  if (step === "period") {
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

        <button type="button" onClick={handleFindFocusPoints} className="btn btn-primary btn-sm mt-4">
          気になる点を探す
        </button>
      </div>
    );
  }

  if (step === "focusPoints") {
    return (
      <div data-testid="ai-advice">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm text-base-content/70">気になる点を選んでください</p>
          <button type="button" onClick={handleReset} className="btn btn-ghost btn-xs">
            期間を選び直す
          </button>
        </div>

        {focusPoints.status === "loading" && (
          <p className="flex items-center gap-2">
            <span className="loading loading-spinner loading-sm" />
            分析中...
          </p>
        )}

        {focusPoints.status === "error" && (
          <p role="alert" className="alert alert-error">
            エラー: {focusPoints.errorMessage}
          </p>
        )}

        {focusPoints.status === "success" && focusPoints.focusPoints.length === 0 && (
          <p className="text-base-content/70">気になる点は見つかりませんでした</p>
        )}

        {focusPoints.status === "success" && focusPoints.focusPoints.length > 0 && (
          <div className="flex flex-col gap-2">
            {focusPoints.focusPoints.map((fp) => (
              <button
                key={fp.title}
                type="button"
                onClick={() => handleSelectFocusPoint(fp)}
                className="btn btn-outline btn-sm justify-start"
              >
                {fp.title}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div data-testid="ai-advice">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-base-content/70">気になる点: {selectedFocusPoint?.title}</p>
        <button type="button" onClick={handleReset} className="btn btn-ghost btn-xs">
          最初からやり直す
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {chat.messages.map((message, index) => (
          <div key={index} className={`chat ${message.role === "ai" ? "chat-start" : "chat-end"}`}>
            <div className={`chat-bubble whitespace-pre-wrap ${message.role === "ai" ? "" : "chat-bubble-primary"}`}>
              {maskText(message.text)}
            </div>
            {message.role === "ai" && (
              <div className="chat-footer">
                {savedMessageIndices.has(index) ? (
                  <span className="text-xs text-success">記憶しました</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSaveMemory(index, message.text)}
                    disabled={memories.mutateState.status === "loading"}
                    className="btn btn-ghost btn-xs"
                  >
                    覚えておく
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {chat.status === "loading" && (
        <p className="mt-3 flex items-center gap-2 text-sm text-base-content/70">
          <span className="loading loading-spinner loading-sm" />
          読み込み中...
        </p>
      )}

      {chat.status === "error" && (
        <p role="alert" className="alert alert-error mt-3">
          エラー: {chat.errorMessage}
        </p>
      )}

      {chat.status === "success" && !chat.isFinal && (
        <div className="mt-3 flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            {chat.quickReplies.map((reply) => (
              <button
                key={reply}
                type="button"
                onClick={() => handleSendReply(reply)}
                className="btn btn-outline btn-sm"
              >
                {reply}
              </button>
            ))}
            {!showFreeTextInput && (
              <button type="button" onClick={() => setShowFreeTextInput(true)} className="btn btn-ghost btn-sm">
                その他を入力
              </button>
            )}
          </div>

          {showFreeTextInput && (
            <form onSubmit={handleSendFreeText} className="flex gap-2">
              <input
                type="text"
                aria-label="自由入力の返信"
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                className="input input-bordered input-sm flex-1"
                autoFocus
              />
              <button type="submit" disabled={!freeText.trim()} className="btn btn-primary btn-sm">
                送信
              </button>
            </form>
          )}
        </div>
      )}

      {chat.status === "success" && chat.isFinal && chat.todoActions.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          <div className="rounded-box border border-base-300 p-3">
            <p className="mb-2 text-sm font-medium">見直し案</p>
            <ul className="flex flex-col gap-1">
              {chat.todoActions.map((action) => (
                <li key={action.category} className="flex justify-between text-sm">
                  <span>{action.category}</span>
                  <span>{hideAmounts ? "***" : `${formatAmount(action.new_budget)}円`}</span>
                </li>
              ))}
            </ul>
          </div>
          <button
            type="button"
            onClick={() => chat.applyTodoActions()}
            disabled={chat.applyState.status === "loading"}
            className="btn btn-primary btn-sm w-fit"
          >
            {chat.applyState.status === "loading" && <span className="loading loading-spinner loading-xs" />}
            この見直し案を予算ページに適用する
          </button>
          {chat.applyState.status === "success" && <p className="text-sm text-success">予算に反映しました</p>}
          {chat.applyState.status === "error" && (
            <p role="alert" className="alert alert-error">
              エラー: {chat.applyState.errorMessage}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
