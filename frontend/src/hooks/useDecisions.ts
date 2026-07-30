import { useEffect, useState } from "react";
import type { Decision, GetDecisionsResponse } from "../types/api";
import { runScript } from "../lib/googleScriptRun";

type LoadStatus = "loading" | "success" | "error";

interface LoadState {
  status: LoadStatus;
  decisions: Decision[];
  errorMessage: string | null;
}

// versionは再取得のトリガー。予算・目標を変更したら呼び出し側で値を進めることで、
// 画面を離れずに最新の履歴へ更新できる
export function useDecisions(version = 0) {
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading", decisions: [], errorMessage: null });

  useEffect(() => {
    let cancelled = false;

    runScript<GetDecisionsResponse>("handleGetDecisions", {})
      .then((data) => {
        if (cancelled) return;

        if (data.error) {
          setLoadState({ status: "error", decisions: [], errorMessage: data.error });
          return;
        }

        setLoadState({ status: "success", decisions: data.decisions, errorMessage: null });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "変更履歴の取得に失敗しました";
        setLoadState({ status: "error", decisions: [], errorMessage: message });
      });

    return () => {
      cancelled = true;
    };
  }, [version]);

  return loadState;
}
