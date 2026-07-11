import { useEffect, useState } from "react";
import type { SummaryUnit, TrendResponse } from "../types/api";
import { runScript } from "../lib/googleScriptRun";

type TrendStatus = "loading" | "success" | "error";

interface TrendState {
  status: TrendStatus;
  data: TrendResponse | null;
  errorMessage: string | null;
}

export function useTrend(unit: SummaryUnit) {
  const [state, setState] = useState<TrendState>({
    status: "loading",
    data: null,
    errorMessage: null,
  });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading", data: null, errorMessage: null });

    runScript<TrendResponse>("handleTrend", { unit })
      .then((data) => {
        if (cancelled) return;

        if (data.error) {
          setState({ status: "error", data: null, errorMessage: data.error });
          return;
        }

        setState({ status: "success", data, errorMessage: null });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "トレンドの取得に失敗しました";
        setState({ status: "error", data: null, errorMessage: message });
      });

    return () => {
      cancelled = true;
    };
  }, [unit]);

  return state;
}
