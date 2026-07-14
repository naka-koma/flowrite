import { useState } from "react";
import { MonthSelector } from "./MonthSelector";
import { YearSelector } from "./YearSelector";
import { useAiChat } from "../hooks/useAiChat";
import { useSettings } from "../hooks/useSettings";
import { maskYenAmounts } from "../lib/money";
import type { SummaryParams } from "../types/api";

type AiPeriodUnit = "month" | "year" | "all";

const UNIT_LABELS: Record<AiPeriodUnit, string> = { month: "月", year: "年", all: "全て" };

interface AiAdviceProps {
  hideAmounts: boolean;
}

export function AiAdvice({ hideAmounts }: AiAdviceProps) {
  const now = new Date();
  const [unit, setUnit] = useState<AiPeriodUnit>("month");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [showFreeTextInput, setShowFreeTextInput] = useState(false);
  const [freeText, setFreeText] = useState("");

  const { status: settingsStatus, settings } = useSettings();
  const chat = useAiChat();

  const summaryParams: SummaryParams =
    unit === "year" ? { unit: "year", year } : unit === "all" ? { unit: "all" } : { unit: "month", year, month };

  const agendaTopics = (settings?.agendaTopics ?? "")
    .split("\n")
    .map((t) => t.trim())
    .filter(Boolean);

  const maskText = (text: string) => (hideAmounts ? maskYenAmounts(text) : text);

  const handleSelectTopic = (topic: string) => {
    setSelectedTopic(topic);
    chat.startChat(topic, summaryParams);
  };

  const handleReset = () => {
    setSelectedTopic(null);
    setShowFreeTextInput(false);
    setFreeText("");
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

  if (!selectedTopic) {
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

        <p className="mb-2 mt-4 text-sm font-medium">相談したいテーマを選んでください</p>

        {settingsStatus === "loading" ? (
          <p className="flex items-center gap-2">
            <span className="loading loading-spinner loading-sm" />
            読み込み中...
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {agendaTopics.map((topic) => (
              <button
                key={topic}
                type="button"
                onClick={() => handleSelectTopic(topic)}
                className="btn btn-outline btn-sm justify-start"
              >
                {topic}
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
        <p className="text-sm text-base-content/70">テーマ: {selectedTopic}</p>
        <button type="button" onClick={handleReset} className="btn btn-ghost btn-xs">
          テーマを選び直す
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {chat.messages.map((message, index) => (
          <div key={index} className={`chat ${message.role === "ai" ? "chat-start" : "chat-end"}`}>
            <div className={`chat-bubble whitespace-pre-wrap ${message.role === "ai" ? "" : "chat-bubble-primary"}`}>
              {maskText(message.text)}
            </div>
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
