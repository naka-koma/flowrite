import { useState } from "react";
import { Search } from "lucide-react";
import Markdown from "react-markdown";
import { useAiChat } from "../hooks/useAiChat";
import { useAiMemories } from "../hooks/useAiMemories";
import { useSettings } from "../hooks/useSettings";
import { formatAmount, maskYenAmounts } from "../lib/money";
import type { TodoActionType } from "../types/api";

// 見直し案がどこに反映されるのかを利用者に明示するためのラベル
const TODO_ACTION_LABELS: Record<TodoActionType, string> = {
  budget: "カテゴリ予算",
  savingsTarget: "目標貯蓄額",
  specialReserve: "特別費積立",
};

const TODO_ACTION_DESCRIPTIONS: Record<TodoActionType, string> = {
  budget: "大項目別の月間予算に反映されます",
  savingsTarget: "家計の目標の貯蓄額に反映されます",
  specialReserve: "家計の目標の特別費積立に反映されます",
};

interface AiAdviceProps {
  hideAmounts: boolean;
}

export function AiAdvice({ hideAmounts }: AiAdviceProps) {
  const [inputText, setInputText] = useState("");
  const [freeText, setFreeText] = useState("");
  const [savedMessageIndices, setSavedMessageIndices] = useState<Set<number>>(new Set());
  // 「覚えておく」はどのメッセージを処理中／失敗したのかを区別して示す
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  const [saveErrorIndex, setSaveErrorIndex] = useState<number | null>(null);

  const chat = useAiChat();
  const memories = useAiMemories();
  const { settings } = useSettings();

  // 設定の相談テーマを、対話の入口に並べる候補ボタンとして使う
  const agendaTopics = (settings?.agendaTopics ?? "")
    .split("\n")
    .map((t) => t.trim())
    .filter((t) => t);

  const maskText = (text: string) => (hideAmounts ? maskYenAmounts(text) : text);

  const handleStart = (topic: string) => {
    const trimmed = topic.trim();
    if (!trimmed) return;
    chat.startChat(trimmed);
  };

  const handleSubmitInput = (e: React.FormEvent) => {
    e.preventDefault();
    handleStart(inputText);
  };

  const handleReset = () => {
    setInputText("");
    setFreeText("");
    setSavedMessageIndices(new Set());
    setSavingIndex(null);
    setSaveErrorIndex(null);
    chat.reset();
  };

  const handleSendReply = (text: string) => {
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
    setSavingIndex(index);
    setSaveErrorIndex(null);

    const ok = await memories.addMemoryFromRawText(text);

    setSavingIndex(null);
    if (ok) {
      setSavedMessageIndices((prev) => new Set(prev).add(index));
    } else {
      setSaveErrorIndex(index);
    }
  };

  // 対話が始まる前は入口を出す。期間はAIがツールで判断するため選ばせない
  if (chat.status === "idle") {
    return (
      <div data-testid="ai-advice">
        <p className="mb-3 text-sm text-base-content/70">何を相談しますか？</p>

        {agendaTopics.length > 0 && (
          <div className="mb-3 flex flex-col gap-2">
            {agendaTopics.map((topic) => (
              <button
                key={topic}
                type="button"
                onClick={() => handleStart(topic)}
                className="btn btn-outline btn-sm justify-start"
              >
                {topic}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmitInput} className="flex gap-2">
          <input
            type="text"
            aria-label="相談したいこと"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="例: 年末の使いすぎを見直したい"
            className="input input-bordered input-sm flex-1"
          />
          <button type="submit" disabled={!inputText.trim()} className="btn btn-primary btn-sm">
            相談する
          </button>
        </form>
      </div>
    );
  }

  return (
    <div data-testid="ai-advice">
      <div className="mb-3 flex items-center justify-end">
        <button type="button" onClick={handleReset} className="btn btn-ghost btn-xs">
          最初からやり直す
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {chat.messages.map((message, index) => (
          <div key={index} className={`chat ${message.role === "ai" ? "chat-start" : "chat-end"}`}>
            {/* 回答の根拠として、AIがそのターンで参照したデータを控えめに示す */}
            {message.toolCalls && message.toolCalls.length > 0 && (
              <div className="chat-header mb-1 flex flex-col gap-0.5 font-normal" data-testid="ai-tool-calls">
                {message.toolCalls.map((call, callIndex) => (
                  <span key={callIndex} className="flex items-center gap-1 text-xs text-base-content/60">
                    <Search aria-hidden="true" className="size-3 shrink-0" />
                    {call.label}
                  </span>
                ))}
              </div>
            )}
            {/* AIの応答は見出し・箇条書きを含むMarkdownで返るため描画する。ユーザーの発言はプレーンテキストのまま */}
            {message.role === "ai" ? (
              <div className="chat-bubble ai-advice-markdown">
                <Markdown>{maskText(message.text)}</Markdown>
              </div>
            ) : (
              <div className="chat-bubble chat-bubble-primary whitespace-pre-wrap">{maskText(message.text)}</div>
            )}
            {message.role === "ai" && (
              <div className="chat-footer flex items-center gap-2">
                {savedMessageIndices.has(index) ? (
                  <span className="text-xs text-success">記憶しました</span>
                ) : savingIndex === index ? (
                  // 要約と保存で2回のサーバー往復が発生するため、処理中であることを明示する
                  <span className="flex items-center gap-1 text-xs text-base-content/70">
                    <span className="loading loading-spinner loading-xs" />
                    記憶しています...
                  </span>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handleSaveMemory(index, message.text)}
                      // 他のメッセージを保存中は、書き込みの競合を避けるため受け付けない
                      disabled={savingIndex !== null}
                      className="btn btn-ghost btn-xs"
                    >
                      覚えておく
                    </button>
                    {saveErrorIndex === index && (
                      <span role="alert" className="text-xs text-error">
                        {memories.mutateState.errorMessage ?? "記憶に失敗しました"}
                      </span>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {chat.status === "loading" && (
        <p className="mt-3 flex items-center gap-2 text-sm text-base-content/70">
          <span className="loading loading-spinner loading-sm" />
          データを確認しています...
        </p>
      )}

      {chat.status === "error" && (
        <p role="alert" className="alert alert-error mt-3">
          エラー: {chat.errorMessage}
        </p>
      )}

      {chat.status === "success" && chat.isFinal && chat.todoActions.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          <div className="rounded-box border border-base-300 p-3">
            <p className="mb-2 text-sm font-medium">見直し案</p>
            <ul className="flex flex-col gap-2">
              {chat.todoActions.map((action, index) => (
                <li key={`${action.type}-${action.category ?? index}`} className="flex justify-between gap-2 text-sm">
                  <span className="flex flex-col">
                    <span>{action.type === "budget" ? action.category : TODO_ACTION_LABELS[action.type]}</span>
                    <span className="text-xs text-base-content/70">{TODO_ACTION_DESCRIPTIONS[action.type]}</span>
                  </span>
                  <span className="shrink-0">{hideAmounts ? "***" : `${formatAmount(action.amount)}円`}</span>
                </li>
              ))}
            </ul>
            {chat.todoActions.some((a) => a.type === "savingsTarget") && (
              <p className="mt-2 text-xs text-base-content/70">
                貯蓄目標を率で設定している場合、適用すると定額指定に切り替わります
              </p>
            )}
          </div>
          {/* 適用済みの案にボタンを残すと二重に反映されるため、成功したら置き換える */}
          {chat.applyState.status === "success" ? (
            <p className="text-sm text-success">予算に反映しました</p>
          ) : (
            <button
              type="button"
              onClick={() => chat.applyTodoActions()}
              disabled={chat.applyState.status === "loading"}
              className="btn btn-primary btn-sm w-fit"
            >
              {chat.applyState.status === "loading" && <span className="loading loading-spinner loading-xs" />}
              この見直し案を予算ページに適用する
            </button>
          )}
          {chat.applyState.status === "error" && (
            <p role="alert" className="alert alert-error">
              エラー: {chat.applyState.errorMessage}
            </p>
          )}
        </div>
      )}

      {/* 見直し案が出た後も掘り下げられるよう、返信欄は常に出しておく */}
      {chat.status === "success" && (
        <div className="mt-3 flex flex-col gap-2">
          {chat.quickReplies.length > 0 && (
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
            </div>
          )}

          <form onSubmit={handleSendFreeText} className="flex gap-2">
            <input
              type="text"
              aria-label="AIへの返信"
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              placeholder="気になったことを聞いてみる"
              className="input input-bordered input-sm flex-1"
            />
            <button type="submit" disabled={!freeText.trim()} className="btn btn-primary btn-sm">
              送信
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
