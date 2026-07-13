import { useState } from "react";
import type { AiAdviceResponse, SummaryParams } from "../types/api";
import { runScript } from "../lib/googleScriptRun";

type AiAdviceStatus = "idle" | "loading" | "success" | "error";

interface AiAdviceState {
  status: AiAdviceStatus;
  advice: string | null;
  errorMessage: string | null;
}

export function useAiAdvice() {
  const [state, setState] = useState<AiAdviceState>({
    status: "idle",
    advice: null,
    errorMessage: null,
  });

  const fetchAdvice = async (params: SummaryParams) => {
    setState({ status: "loading", advice: null, errorMessage: null });

    try {
      const data = await runScript<AiAdviceResponse>("handleAiAdvice", params);

      if (!data.success) {
        setState({
          status: "error",
          advice: null,
          errorMessage: data.error ?? "アドバイスの取得に失敗しました",
        });
        return;
      }

      setState({ status: "success", advice: data.advice, errorMessage: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : "アドバイスの取得に失敗しました";
      setState({ status: "error", advice: null, errorMessage: message });
    }
  };

  return { ...state, fetchAdvice };
}
