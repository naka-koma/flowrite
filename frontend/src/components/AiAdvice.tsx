import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Search } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAiCategorySuggestions } from "../hooks/useAiCategorySuggestions";
import { useAiChat } from "../hooks/useAiChat";
import { useAiMemories } from "../hooks/useAiMemories";
import { useSettings } from "../hooks/useSettings";
import { formatAmount, maskYenAmounts } from "../lib/money";
import type { TodoAction, TodoActionType } from "../types/api";

// 見直し案の各項目を一意に識別するキー。予算はcategory名、貯蓄・積立はtypeそのものが
// 一意になる（同じ対話ターンでsavingsTargetやspecialReserveが複数出ることはないため）
function todoActionKey(action: TodoAction, index: number): string {
  return `${action.type}-${action.category ?? index}`;
}

// 折りたたんだときに常に表示しておく直近のメッセージ数（2往復分）
const COLLAPSE_VISIBLE_COUNT = 4;

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
  // 分類の見直し案は取引ごとにチェックを外して選べるようにする
  const [checkedCategoryIds, setCheckedCategoryIds] = useState<Set<string>>(new Set());
  // 見直し案は項目ごとに個別適用できるため、適用状況もキー単位で管理する
  const [appliedActionKeys, setAppliedActionKeys] = useState<Set<string>>(new Set());
  const [applyingActionKey, setApplyingActionKey] = useState<string | null>(null);
  const [applyErrorKey, setApplyErrorKey] = useState<string | null>(null);
  const [applyErrorMessage, setApplyErrorMessage] = useState<string | null>(null);
  // 履歴が長いとスクロールに時間がかかるため、直近のやり取りだけを表示できるようにする
  const [historyCollapsed, setHistoryCollapsed] = useState(false);
  // 復元直後（またはこのページを開いた最初のターン）にだけ、長い履歴を自動で折りたたむ。
  // 一度判定したら、対話が伸びていく途中で勝手に折りたたまれることはない
  const didAutoCollapseRef = useRef(false);

  const chat = useAiChat();
  const memories = useAiMemories();
  const categorySuggestionsAi = useAiCategorySuggestions();
  const { settings } = useSettings();

  // 新しいターンの提案が来たら、チェック状態を全選択にリセットし、
  // 前ターンの適用結果（成功/失敗表示）も持ち越さない
  useEffect(() => {
    setCheckedCategoryIds(new Set(chat.categorySuggestions.map((s) => s.id)));
    categorySuggestionsAi.reset();
  }, [chat.categorySuggestions]);

  // 見直し案も同様に、新しいターンが来たら前ターンの適用状況を持ち越さない
  useEffect(() => {
    setAppliedActionKeys(new Set());
    setApplyingActionKey(null);
    setApplyErrorKey(null);
    setApplyErrorMessage(null);
  }, [chat.todoActions]);

  // 対話が復元された直後（このコンポーネントで最初にsuccessになった時点）に、
  // 既に長い履歴であれば自動で折りたたむ。新しい対話は1件ずつしか増えないため
  // この最初の判定でCOLLAPSE_VISIBLE_COUNTを超えることはなく、誤って畳まれない
  useEffect(() => {
    if (didAutoCollapseRef.current || chat.status !== "success") return;
    didAutoCollapseRef.current = true;
    if (chat.messages.length > COLLAPSE_VISIBLE_COUNT) {
      setHistoryCollapsed(true);
    }
  }, [chat.status, chat.messages.length]);

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
    setCheckedCategoryIds(new Set());
    setAppliedActionKeys(new Set());
    setApplyingActionKey(null);
    setApplyErrorKey(null);
    setApplyErrorMessage(null);
    setHistoryCollapsed(false);
    didAutoCollapseRef.current = false;
    categorySuggestionsAi.reset();
    chat.reset();
  };

  const handleSendReply = async (text: string) => {
    // 失敗時は再送できるよう、成功したときだけ入力欄を空にする
    const ok = await chat.sendReply(text);
    if (ok) {
      setFreeText("");
    }
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

  const handleApplyTodoAction = async (action: TodoAction, index: number) => {
    const key = todoActionKey(action, index);
    setApplyingActionKey(key);
    setApplyErrorKey(null);

    const result = await chat.applyTodoAction(action);

    setApplyingActionKey(null);
    if (result.success) {
      setAppliedActionKeys((prev) => new Set(prev).add(key));
    } else {
      setApplyErrorKey(key);
      setApplyErrorMessage(result.errorMessage ?? "見直し案の反映に失敗しました");
    }
  };

  const toggleCategoryChecked = (id: string) => {
    setCheckedCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleApplyCategorySuggestions = () => {
    const selected = chat.categorySuggestions
      .filter((s) => checkedCategoryIds.has(s.id))
      .map((s) => ({ id: s.id, category: s.suggestedCategory, subcategory: s.suggestedSubcategory }));
    if (selected.length === 0) return;
    categorySuggestionsAi.applySuggestions(selected);
  };

  // 起動直後、保存済みの対話がないか確認している間の表示。
  // 入口画面をチラつかせないよう、確認が終わるまではこちらを出す
  if (chat.status === "restoring") {
    return (
      <div data-testid="ai-advice">
        <p className="flex items-center gap-2 text-sm text-base-content/70">
          <span className="loading loading-spinner loading-sm" />
          読み込んでいます...
        </p>
      </div>
    );
  }

  // 対話が始まる前は入口を出す。期間はAIがツールで判断するため選ばせない
  if (chat.status === "idle") {
    return (
      <div data-testid="ai-advice">
        <p className="mb-3 text-sm text-base-content/70">何を相談しますか？</p>

        {chat.errorMessage && (
          <p role="alert" className="alert alert-error mb-3">
            エラー: {chat.errorMessage}
          </p>
        )}

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

      {chat.messages.length > COLLAPSE_VISIBLE_COUNT && (
        <button
          type="button"
          onClick={() => setHistoryCollapsed((c) => !c)}
          data-testid="chat-history-toggle"
          className="btn btn-ghost btn-xs mb-2 self-start"
        >
          {historyCollapsed ? (
            <>
              <ChevronDown aria-hidden="true" className="size-3" />
              過去のやり取りを表示する（{chat.messages.length - COLLAPSE_VISIBLE_COUNT}件）
            </>
          ) : (
            <>
              <ChevronUp aria-hidden="true" className="size-3" />
              過去のやり取りを折りたたむ
            </>
          )}
        </button>
      )}

      <div className="flex flex-col gap-3">
        {chat.messages
          .slice(historyCollapsed ? -COLLAPSE_VISIBLE_COUNT : 0)
          .map((message, i) => {
            // 折りたたみ時は配列の先頭を切り詰めているため、「覚えておく」の状態管理に
            // 使う本来のインデックスをオフセットして復元する
            const index = historyCollapsed ? chat.messages.length - COLLAPSE_VISIBLE_COUNT + i : i;
            return (
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
                <Markdown remarkPlugins={[remarkGfm]}>{maskText(message.text)}</Markdown>
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
            );
          })}
      </div>

      {chat.status === "loading" && (
        <p className="mt-3 flex items-center gap-2 text-sm text-base-content/70">
          <span className="loading loading-spinner loading-sm" />
          データを確認しています...
        </p>
      )}

      {/* 対話継続中の失敗はstatusを"success"に保ったままerrorMessageだけを添えるため、
          statusではなくerrorMessageの有無で表示する。メッセージ一覧・quick_replies・
          返信欄はそのまま残るので、ここから再送できる */}
      {chat.status === "success" && chat.errorMessage && (
        <p role="alert" className="alert alert-error mt-3">
          エラー: {chat.errorMessage}
        </p>
      )}

      {chat.status === "success" && chat.isFinal && chat.todoActions.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          <div className="rounded-box border border-base-300 p-3">
            <p className="mb-2 text-sm font-medium">見直し案</p>
            <ul className="flex flex-col gap-2">
              {chat.todoActions.map((action, index) => {
                const key = todoActionKey(action, index);
                return (
                  <li key={key} className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex flex-col">
                      <span>{action.type === "budget" ? action.category : TODO_ACTION_LABELS[action.type]}</span>
                      <span className="text-xs text-base-content/70">{TODO_ACTION_DESCRIPTIONS[action.type]}</span>
                      {applyErrorKey === key && (
                        <span role="alert" className="text-xs text-error">
                          {applyErrorMessage}
                        </span>
                      )}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span>{hideAmounts ? "***" : `${formatAmount(action.amount)}円`}</span>
                      {appliedActionKeys.has(key) ? (
                        <span className="text-xs text-success">適用済み</span>
                      ) : applyingActionKey === key ? (
                        <span className="loading loading-spinner loading-xs" />
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleApplyTodoAction(action, index)}
                          // 他の項目を適用中は、書き込みの競合を避けるため受け付けない
                          disabled={applyingActionKey !== null}
                          className="btn btn-primary btn-xs"
                        >
                          適用する
                        </button>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
            {chat.todoActions.some((a) => a.type === "savingsTarget") && (
              <p className="mt-2 text-xs text-base-content/70">
                貯蓄目標を率で設定している場合、適用すると定額指定に切り替わります
              </p>
            )}
          </div>
        </div>
      )}

      {chat.status === "success" && chat.categorySuggestions.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          <div className="rounded-box border border-base-300 p-3">
            <p className="mb-2 text-sm font-medium">分類の見直し案</p>
            <ul className="flex flex-col gap-2">
              {chat.categorySuggestions.map((s) => (
                <li key={s.id} className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={checkedCategoryIds.has(s.id)}
                    onChange={() => toggleCategoryChecked(s.id)}
                    aria-label={`${s.content}の分類を変更する`}
                    className="checkbox checkbox-sm mt-0.5 shrink-0"
                  />
                  <span className="flex flex-1 flex-col">
                    <span className="flex justify-between gap-2">
                      <span>{s.content}</span>
                      <span className="shrink-0">{hideAmounts ? "***" : `${formatAmount(Math.abs(s.amount))}円`}</span>
                    </span>
                    <span className="text-xs text-base-content/70">
                      {s.currentCategory}:{s.currentSubcategory} → {s.suggestedCategory}:{s.suggestedSubcategory}
                      {s.isNewCategory && <span className="badge badge-warning badge-xs ml-1">新規</span>}
                    </span>
                    <span className="text-xs text-base-content/70">{s.reason}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          {categorySuggestionsAi.applyState.status === "success" ? (
            <p className="text-sm text-success">分類を更新しました</p>
          ) : (
            <button
              type="button"
              onClick={handleApplyCategorySuggestions}
              disabled={checkedCategoryIds.size === 0 || categorySuggestionsAi.applyState.status === "loading"}
              className="btn btn-primary btn-sm w-fit"
            >
              {categorySuggestionsAi.applyState.status === "loading" && (
                <span className="loading loading-spinner loading-xs" />
              )}
              選択した分類を反映する
            </button>
          )}
          {categorySuggestionsAi.applyState.status === "error" && (
            <p role="alert" className="alert alert-error">
              エラー: {categorySuggestionsAi.applyState.errorMessage}
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

          <form onSubmit={handleSendFreeText} className="flex items-end gap-2">
            {/* textareaはEnterで改行でき、フォームを誤って送信しない
                （input type="text"と異なりEnterでsubmitイベントが発火しない） */}
            <textarea
              aria-label="AIへの返信"
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              placeholder="気になったことを聞いてみる"
              rows={2}
              className="textarea textarea-bordered textarea-sm flex-1 resize-none"
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
