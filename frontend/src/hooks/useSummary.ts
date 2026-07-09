import { useEffect, useState } from "react";
import type { SummaryResponse } from "../types/api";
import { apiUrl } from "../lib/apiBase";

type SummaryStatus = "loading" | "success" | "error";

interface SummaryState {
  status: SummaryStatus;
  data: SummaryResponse | null;
  errorMessage: string | null;
}

export function useSummary(year: number, month: number) {
  const [state, setState] = useState<SummaryState>({
    status: "loading",
    data: null,
    errorMessage: null,
  });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading", data: null, errorMessage: null });

    fetch(apiUrl(`?action=summary&year=${year}&month=${month}`))
      .then((response) => response.json())
      .then((data: SummaryResponse) => {
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
  }, [year, month]);

  return state;
}
