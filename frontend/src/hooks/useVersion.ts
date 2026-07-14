import { useEffect, useState } from "react";
import type { GetVersionResponse } from "../types/api";
import { runScript } from "../lib/googleScriptRun";

type Status = "loading" | "success" | "error";

interface VersionState {
  status: Status;
  version: string | null;
  errorMessage: string | null;
}

export function useVersion() {
  const [state, setState] = useState<VersionState>({ status: "loading", version: null, errorMessage: null });

  useEffect(() => {
    let cancelled = false;

    runScript<GetVersionResponse>("handleGetVersion")
      .then((data) => {
        if (cancelled) return;

        if (data.error) {
          setState({ status: "error", version: null, errorMessage: data.error });
          return;
        }

        setState({ status: "success", version: data.version, errorMessage: null });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "バージョン情報の取得に失敗しました";
        setState({ status: "error", version: null, errorMessage: message });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
