import { useEffect, useState } from "react";
import type { SummaryParams, SummaryResponse } from "../types/api";
import { runScript } from "../lib/googleScriptRun";

type SummaryStatus = "loading" | "success" | "error";

interface SummaryState {
  status: SummaryStatus;
  data: SummaryResponse | null;
  errorMessage: string | null;
}

export function useSummary(params: SummaryParams) {
  const [state, setState] = useState<SummaryState>({
    status: "loading",
    data: null,
    errorMessage: null,
  });

  // paramsはunitごとに形が異なるため、内容の変化をJSON文字列で比較する
  const paramsKey = JSON.stringify(params);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading", data: null, errorMessage: null });

    runScript<SummaryResponse>("handleSummary", params)
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
        const message = error instanceof Error ? error.message : "サマリーの取得に失敗しました";
        setState({ status: "error", data: null, errorMessage: message });
      });

    return () => {
      cancelled = true;
    };
  }, [paramsKey]);

  return state;
}
