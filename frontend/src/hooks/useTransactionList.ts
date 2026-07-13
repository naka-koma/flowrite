import { useEffect, useState } from "react";
import type { TransactionListParams, TransactionListResponse } from "../types/api";
import { runScript } from "../lib/googleScriptRun";

type TransactionListStatus = "loading" | "success" | "error";

interface TransactionListState {
  status: TransactionListStatus;
  data: TransactionListResponse | null;
  errorMessage: string | null;
}

export function useTransactionList(params: TransactionListParams) {
  const [state, setState] = useState<TransactionListState>({
    status: "loading",
    data: null,
    errorMessage: null,
  });
  const [reloadKey, setReloadKey] = useState(0);

  const paramsKey = JSON.stringify(params);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading", data: null, errorMessage: null });

    runScript<TransactionListResponse>("handleTransactionList", params)
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
        const message = error instanceof Error ? error.message : "取引一覧の取得に失敗しました";
        setState({ status: "error", data: null, errorMessage: message });
      });

    return () => {
      cancelled = true;
    };
  }, [paramsKey, reloadKey]);

  const reload = () => setReloadKey((k) => k + 1);

  return { ...state, reload };
}
