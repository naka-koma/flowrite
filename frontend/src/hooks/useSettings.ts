import { useEffect, useState } from "react";
import type { Settings, UpdateSettingsResponse } from "../types/api";
import { runScript } from "../lib/googleScriptRun";

type LoadStatus = "loading" | "success" | "error";
type SaveStatus = "idle" | "loading" | "success" | "error";

interface LoadState {
  status: LoadStatus;
  settings: Settings | null;
  errorMessage: string | null;
}

interface SaveState {
  status: SaveStatus;
  errorMessage: string | null;
}

export function useSettings() {
  const [loadState, setLoadState] = useState<LoadState>({
    status: "loading",
    settings: null,
    errorMessage: null,
  });
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle", errorMessage: null });

  useEffect(() => {
    let cancelled = false;

    runScript<Settings>("handleGetSettings")
      .then((data) => {
        if (cancelled) return;

        if (data.error) {
          setLoadState({ status: "error", settings: null, errorMessage: data.error });
          return;
        }

        setLoadState({ status: "success", settings: data, errorMessage: null });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "設定の取得に失敗しました";
        setLoadState({ status: "error", settings: null, errorMessage: message });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const saveSettings = async (settings: Settings) => {
    setSaveState({ status: "loading", errorMessage: null });

    try {
      const data = await runScript<UpdateSettingsResponse>("handleUpdateSettings", settings);

      if (!data.success) {
        setSaveState({ status: "error", errorMessage: data.error ?? "設定の保存に失敗しました" });
        return;
      }

      setSaveState({ status: "success", errorMessage: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : "設定の保存に失敗しました";
      setSaveState({ status: "error", errorMessage: message });
    }
  };

  return { ...loadState, saveState, saveSettings };
}
