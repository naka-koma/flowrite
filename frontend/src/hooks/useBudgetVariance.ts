import { useEffect, useState } from "react";
import type { GetBudgetVarianceParams, GetBudgetVarianceResponse } from "../types/api";
import { runScript } from "../lib/googleScriptRun";

type Status = "loading" | "success" | "error";

interface BudgetVarianceState {
  status: Status;
  data: GetBudgetVarianceResponse | null;
  errorMessage: string | null;
}

export function useBudgetVariance(params: GetBudgetVarianceParams) {
  const [state, setState] = useState<BudgetVarianceState>({ status: "loading", data: null, errorMessage: null });

  const paramsKey = JSON.stringify(params);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading", data: null, errorMessage: null });

    runScript<GetBudgetVarianceResponse>("handleGetBudgetVariance", { unit: "month", ...params })
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
        const message = error instanceof Error ? error.message : "予算対比の取得に失敗しました";
        setState({ status: "error", data: null, errorMessage: message });
      });

    return () => {
      cancelled = true;
    };
  }, [paramsKey]);

  return state;
}
