import { useState } from "react";
import type { RunMigrationsResponse } from "../types/api";
import { runScript } from "../lib/googleScriptRun";

type MigrationsStatus = "idle" | "loading" | "success" | "error";

interface MigrationsState {
  status: MigrationsStatus;
  data: RunMigrationsResponse | null;
  errorMessage: string | null;
}

export function useMigrations() {
  const [state, setState] = useState<MigrationsState>({
    status: "idle",
    data: null,
    errorMessage: null,
  });

  const runMigrations = async () => {
    setState({ status: "loading", data: null, errorMessage: null });

    try {
      const data = await runScript<RunMigrationsResponse>("handleRunMigrations");

      if (data.error) {
        setState({ status: "error", data: null, errorMessage: data.error });
        return;
      }

      setState({ status: "success", data, errorMessage: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : "マイグレーションの実行に失敗しました";
      setState({ status: "error", data: null, errorMessage: message });
    }
  };

  return { ...state, runMigrations };
}
