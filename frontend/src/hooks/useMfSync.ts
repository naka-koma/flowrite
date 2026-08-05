import { useEffect, useState } from "react";
import type { CompleteMfSyncResponse, MfSyncDiffResponse, MfSyncDiffRow } from "../types/api";
import { runScript } from "../lib/googleScriptRun";

type Status = "loading" | "success" | "error";
type CompleteStatus = "idle" | "loading" | "success" | "error";

interface State {
  status: Status;
  rows: MfSyncDiffRow[];
  checkpoint: string;
  errorMessage: string | null;
}

const INITIAL_STATE: State = { status: "loading", rows: [], checkpoint: "", errorMessage: null };

export function useMfSync() {
  const [state, setState] = useState<State>(INITIAL_STATE);
  const [completeStatus, setCompleteStatus] = useState<CompleteStatus>("idle");

  const fetchDiff = async () => {
    setState((current) => ({ ...current, status: "loading" }));

    try {
      const data = await runScript<MfSyncDiffResponse>("handleGetMfSyncDiff");

      if (!data.success) {
        setState({ status: "error", rows: [], checkpoint: "", errorMessage: data.error ?? "差分の取得に失敗しました" });
        return;
      }

      setState({ status: "success", rows: data.rows, checkpoint: data.checkpoint, errorMessage: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : "差分の取得に失敗しました";
      setState({ status: "error", rows: [], checkpoint: "", errorMessage: message });
    }
  };

  useEffect(() => {
    fetchDiff();
  }, []);

  // 書き戻し完了の記録後は、次回以降の差分に反映されるよう取得し直す
  const completeSync = async (): Promise<boolean> => {
    setCompleteStatus("loading");

    try {
      const data = await runScript<CompleteMfSyncResponse>("handleCompleteMfSync");

      if (!data.success) {
        setCompleteStatus("error");
        return false;
      }

      setCompleteStatus("success");
      await fetchDiff();
      return true;
    } catch {
      setCompleteStatus("error");
      return false;
    }
  };

  return { ...state, completeStatus, fetchDiff, completeSync };
}
