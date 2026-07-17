import { useState } from "react";
import type { AiFocusPoint, GetAiFocusPointsResponse, SummaryParams } from "../types/api";
import { runScript } from "../lib/googleScriptRun";

type Status = "idle" | "loading" | "success" | "error";

interface State {
  status: Status;
  focusPoints: AiFocusPoint[];
  errorMessage: string | null;
}

const INITIAL_STATE: State = { status: "idle", focusPoints: [], errorMessage: null };

export function useAiFocusPoints() {
  const [state, setState] = useState<State>(INITIAL_STATE);

  const fetchFocusPoints = async (summaryParams: SummaryParams) => {
    setState({ ...INITIAL_STATE, status: "loading" });

    try {
      const data = await runScript<GetAiFocusPointsResponse>("handleGetAiFocusPoints", { summaryParams });

      if (!data.success) {
        setState({ ...INITIAL_STATE, status: "error", errorMessage: data.error ?? "気になる点の取得に失敗しました" });
        return;
      }

      setState({ status: "success", focusPoints: data.focusPoints, errorMessage: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : "気になる点の取得に失敗しました";
      setState({ ...INITIAL_STATE, status: "error", errorMessage: message });
    }
  };

  const reset = () => setState(INITIAL_STATE);

  return { ...state, fetchFocusPoints, reset };
}
