import { useState } from "react";
import type { AiChatResponse, ChatTurn, StartAiChatParams, SummaryParams, TodoAction } from "../types/api";
import { runScript } from "../lib/googleScriptRun";

type ChatStatus = "idle" | "loading" | "success" | "error";
type ApplyStatus = "idle" | "loading" | "success" | "error";

export interface ChatMessage {
  role: "user" | "ai";
  text: string;
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

  const applyResponse = (userText: string | null, data: AiChatResponse) => {
    if (!data.success) {
      setState((s) => ({ ...s, status: "error", errorMessage: data.error ?? "対話の取得に失敗しました" }));
      return;
    }

    setState((s) => ({
      status: "success",
      messages: [
        ...s.messages,
        ...(userText ? [{ role: "user" as const, text: userText }] : []),
        { role: "ai" as const, text: data.ai_message },
      ],
      quickReplies: data.quick_replies,
      isFinal: data.is_final,
      todoActions: data.todo_actions,
      history: data.history,
      errorMessage: null,
    }));
  };

  const startChat = async (agendaTopic: string, summaryParams: SummaryParams) => {
    setState({ ...INITIAL_STATE, status: "loading" });

    try {
      const params: StartAiChatParams = { agendaTopic, summaryParams };
      const data = await runScript<AiChatResponse>("handleStartAiChat", params);
      applyResponse(null, data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "対話の取得に失敗しました";
      setState((s) => ({ ...s, status: "error", errorMessage: message }));
    }
  };

  const sendReply = async (userReply: string) => {
    setState((s) => ({ ...s, status: "loading" }));

    try {
      const data = await runScript<AiChatResponse>("handleContinueAiChat", {
        history: state.history,
        userReply,
      });
      applyResponse(userReply, data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "対話の取得に失敗しました";
      setState((s) => ({ ...s, status: "error", errorMessage: message }));
    }
  };

  const reset = () => {
    setState(INITIAL_STATE);
    setApplyState({ status: "idle", errorMessage: null });
  };

  const applyTodoActions = async () => {
    setApplyState({ status: "loading", errorMessage: null });

    try {
      const results = await Promise.all(
        state.todoActions.map((action) =>
          runScript<{ success: boolean; error?: string }>("handleUpsertBudget", {
            category: action.category,
            monthlyBudget: action.new_budget,
          }),
        ),
      );

      const failed = results.find((r) => !r.success);
      if (failed) {
        setApplyState({ status: "error", errorMessage: failed.error ?? "予算への反映に失敗しました" });
        return false;
      }

      setApplyState({ status: "success", errorMessage: null });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "予算への反映に失敗しました";
      setApplyState({ status: "error", errorMessage: message });
      return false;
    }
  };

  return { ...state, applyState, startChat, sendReply, applyTodoActions, reset };
}
