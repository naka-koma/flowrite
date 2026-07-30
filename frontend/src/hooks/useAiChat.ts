import { useState } from "react";
import type {
  AiChatResponse,
  AiToolCall,
  ApplyTodoActionsParams,
  ApplyTodoActionsResponse,
  ChatTurn,
  StartAiChatParams,
  TodoAction,
} from "../types/api";
import { runScript } from "../lib/googleScriptRun";

// 対話中の失敗は"error"にせず、直前の状態を保持したまま"success"に留める。
// 会話がある状態で"error"にすると、messages/quickReplies等が読めなくなり
// 再開する手段が失われるため
type ChatStatus = "idle" | "loading" | "success";
type ApplyStatus = "idle" | "loading" | "success" | "error";

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
  history: ChatTurn[];
  errorMessage: string | null;
}

const INITIAL_STATE: ChatState = {
  status: "idle",
  messages: [],
  quickReplies: [],
  isFinal: false,
  todoActions: [],
  history: [],
  errorMessage: null,
};

export function useAiChat() {
  const [state, setState] = useState<ChatState>(INITIAL_STATE);
  const [applyState, setApplyState] = useState<{ status: ApplyStatus; errorMessage: string | null }>({
    status: "idle",
    errorMessage: null,
  });

  // isInitial=trueの失敗（対話開始前）は会話が存在しないため入口へ戻す。
  // falseの失敗（対話継続中）は直前のmessages/quickReplies等を保持したまま
  // errorMessageだけを添え、ユーザーが同じ場所から再送できるようにする
  const applyResponse = (userText: string | null, data: AiChatResponse, isInitial: boolean): boolean => {
    if (!data.success) {
      const errorMessage = data.error ?? "対話の取得に失敗しました";
      if (isInitial) {
        setState({ ...INITIAL_STATE, errorMessage });
      } else {
        setState((s) => ({ ...s, status: "success", errorMessage }));
      }
      return false;
    }

    // 対話が進むと新しい見直し案が出うるため、前ターンの適用結果は持ち越さない
    setApplyState({ status: "idle", errorMessage: null });

    setState((s) => ({
      status: "success",
      messages: [
        ...s.messages,
        ...(userText ? [{ role: "user" as const, text: userText }] : []),
        { role: "ai" as const, text: data.ai_message, toolCalls: data.tool_calls ?? [] },
      ],
      quickReplies: data.quick_replies,
      isFinal: data.is_final,
      todoActions: data.todo_actions,
      history: data.history,
      errorMessage: null,
    }));
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
      setState({ ...INITIAL_STATE, errorMessage: message });
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

  const reset = () => {
    setState(INITIAL_STATE);
    setApplyState({ status: "idle", errorMessage: null });
  };

  // 見直し案はカテゴリ予算と家計の目標の両方に跨るため、GAS側で一括して反映する
  const applyTodoActions = async () => {
    setApplyState({ status: "loading", errorMessage: null });

    try {
      const params: ApplyTodoActionsParams = { actions: state.todoActions };
      const data = await runScript<ApplyTodoActionsResponse>("handleApplyAiTodoActions", params);

      if (!data.success) {
        setApplyState({ status: "error", errorMessage: data.error ?? "見直し案の反映に失敗しました" });
        return false;
      }

      setApplyState({ status: "success", errorMessage: null });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "見直し案の反映に失敗しました";
      setApplyState({ status: "error", errorMessage: message });
      return false;
    }
  };

  return { ...state, applyState, startChat, sendReply, applyTodoActions, reset };
}
