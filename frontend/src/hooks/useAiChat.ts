import { useEffect, useState } from "react";
import type {
  AiCategorySuggestion,
  AiChatResponse,
  AiChatSession,
  AiToolCall,
  ApplyTodoActionsParams,
  ApplyTodoActionsResponse,
  ChatTurn,
  ClearAiChatSessionResponse,
  GetAiChatSessionResponse,
  SaveAiChatSessionResponse,
  StartAiChatParams,
  TodoAction,
} from "../types/api";
import { runScript } from "../lib/googleScriptRun";

// "restoring"は起動直後、保存済みの対話があるか確認している間だけの状態。
// 対話中の失敗は"error"にせず、直前の状態を保持したまま"success"に留める。
// 会話がある状態で"error"にすると、messages/quickReplies等が読めなくなり
// 再開する手段が失われるため
type ChatStatus = "restoring" | "idle" | "loading" | "success";

// 見直し案の適用結果。項目ごとの状態は呼び出し元（AiAdvice）が管理するため、
// ここでは1回の適用呼び出しの成否だけを返す
interface ApplyTodoActionResult {
  success: boolean;
  errorMessage?: string;
}

export interface ChatMessage {
  role: "user" | "ai";
  text: string;
  // AIの発言のみ。そのターンで参照したデータを回答の根拠として保持する
  toolCalls?: AiToolCall[];
}

interface ChatState {
  status: ChatStatus;
  messages: ChatMessage[];
  quickReplies: string[];
  isFinal: boolean;
  todoActions: TodoAction[];
  categorySuggestions: AiCategorySuggestion[];
  history: ChatTurn[];
  errorMessage: string | null;
}

const INITIAL_STATE: ChatState = {
  status: "restoring",
  messages: [],
  quickReplies: [],
  isFinal: false,
  todoActions: [],
  categorySuggestions: [],
  history: [],
  errorMessage: null,
};

// 直近1件だけを上書き保存する。保存に失敗してもUIをブロックしないよう、
// 呼び出し元では結果を待たずfire-and-forgetで呼ぶ。GASが正常終了しつつ
// success:falseを返す場合と、通信自体が失敗する場合の両方をログに残す
function saveSession(session: AiChatSession) {
  runScript<SaveAiChatSessionResponse>("handleSaveAiChatSession", { session })
    .then((data) => {
      if (!data.success) {
        console.error("AIチャットの保存に失敗しました", data.error);
      }
    })
    .catch((error: unknown) => {
      console.error("AIチャットの保存に失敗しました", error);
    });
}

export function useAiChat() {
  const [state, setState] = useState<ChatState>(INITIAL_STATE);

  // 起動直後に保存済みの対話がないか確認し、あれば即座に復元する。
  // これにより「続きから」ボタンなしで、開いた瞬間に対話が再開する
  useEffect(() => {
    let cancelled = false;

    runScript<GetAiChatSessionResponse>("handleGetAiChatSession")
      .then((data) => {
        if (cancelled) return;

        if (data.session) {
          const session = data.session;
          setState({
            status: "success",
            messages: session.messages,
            quickReplies: session.quickReplies,
            isFinal: session.isFinal,
            todoActions: session.todoActions,
            categorySuggestions: session.categorySuggestions,
            history: session.history,
            errorMessage: null,
          });
        } else {
          setState((s) => ({ ...s, status: "idle" }));
        }
      })
      .catch(() => {
        if (cancelled) return;
        // 復元に失敗しても対話自体はできるよう、入口から始められるようにする
        setState((s) => ({ ...s, status: "idle" }));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // isInitial=trueの失敗（対話開始前）は会話が存在しないため入口へ戻す。
  // falseの失敗（対話継続中）は直前のmessages/quickReplies等を保持したまま
  // errorMessageだけを添え、ユーザーが同じ場所から再送できるようにする
  const applyResponse = (userText: string | null, data: AiChatResponse, isInitial: boolean): boolean => {
    if (!data.success) {
      const errorMessage = data.error ?? "対話の取得に失敗しました";
      if (isInitial) {
        setState({ ...INITIAL_STATE, status: "idle", errorMessage });
      } else {
        setState((s) => ({ ...s, status: "success", errorMessage }));
      }
      return false;
    }

    // isInitialの場合は新しい対話なので、直前のmessagesは引き継がない
    // （startChatが直前に行うリセットは次のレンダーまで反映されないため、
    // ここでstate.messagesを読むと古い対話が残ってしまう）
    const messages: ChatMessage[] = [
      ...(isInitial ? [] : state.messages),
      ...(userText ? [{ role: "user" as const, text: userText }] : []),
      { role: "ai" as const, text: data.ai_message, toolCalls: data.tool_calls ?? [] },
    ];

    setState({
      status: "success",
      messages,
      quickReplies: data.quick_replies,
      isFinal: data.is_final,
      todoActions: data.todo_actions,
      categorySuggestions: data.category_suggestions,
      history: data.history,
      errorMessage: null,
    });

    saveSession({
      updatedAt: new Date().toISOString(),
      messages,
      history: data.history,
      quickReplies: data.quick_replies,
      isFinal: data.is_final,
      todoActions: data.todo_actions,
      categorySuggestions: data.category_suggestions,
    });

    return true;
  };

  // 対象期間はAIがツールで判断するため、クライアントからは相談テーマのみを渡す
  const startChat = async (agendaTopic: string) => {
    setState({ ...INITIAL_STATE, status: "loading" });

    try {
      const params: StartAiChatParams = { agendaTopic };
      const data = await runScript<AiChatResponse>("handleStartAiChat", params);
      applyResponse(null, data, true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "対話の取得に失敗しました";
      setState({ ...INITIAL_STATE, status: "idle", errorMessage: message });
    }
  };

  const sendReply = async (userReply: string): Promise<boolean> => {
    setState((s) => ({ ...s, status: "loading", errorMessage: null }));

    try {
      const data = await runScript<AiChatResponse>("handleContinueAiChat", {
        history: state.history,
        userReply,
      });
      return applyResponse(userReply, data, false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "対話の取得に失敗しました";
      setState((s) => ({ ...s, status: "success", errorMessage: message }));
      return false;
    }
  };

  // 保存された対話を破棄してから、入口に戻る
  const reset = () => {
    runScript<ClearAiChatSessionResponse>("handleClearAiChatSession").catch((error: unknown) => {
      console.error("AIチャットの削除に失敗しました", error);
    });
    setState({ ...INITIAL_STATE, status: "idle" });
  };

  // 見直し案を1件ずつ適用する。以前は配列をまとめて渡していたが、
  // 項目ごとに個別に反映できるよう単一のアクションを受け取る形に変えた（#194）。
  // handleApplyAiTodoActionsは元々1件ずつ処理する実装のため、バックエンド側の変更は不要
  const applyTodoAction = async (action: TodoAction): Promise<ApplyTodoActionResult> => {
    try {
      const params: ApplyTodoActionsParams = { actions: [action] };
      const data = await runScript<ApplyTodoActionsResponse>("handleApplyAiTodoActions", params);

      if (!data.success) {
        return { success: false, errorMessage: data.error ?? "見直し案の反映に失敗しました" };
      }
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "見直し案の反映に失敗しました";
      return { success: false, errorMessage: message };
    }
  };

  return { ...state, startChat, sendReply, applyTodoAction, reset };
}
