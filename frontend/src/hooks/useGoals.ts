import { useEffect, useState } from "react";
import type { GetGoalsResponse, Goals, UpdateGoalsParams, UpdateGoalsResponse } from "../types/api";
import { runScript } from "../lib/googleScriptRun";

type LoadStatus = "loading" | "success" | "error";
type SaveStatus = "idle" | "loading" | "success" | "error";

interface LoadState {
  status: LoadStatus;
  goals: Goals | null;
  errorMessage: string | null;
}

interface SaveState {
  status: SaveStatus;
  errorMessage: string | null;
}

export function useGoals() {
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading", goals: null, errorMessage: null });
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle", errorMessage: null });

  useEffect(() => {
    let cancelled = false;

    runScript<GetGoalsResponse>("handleGetGoals")
      .then((data) => {
        if (cancelled) return;

        if (data.error) {
          setLoadState({ status: "error", goals: null, errorMessage: data.error });
          return;
        }

        setLoadState({ status: "success", goals: data, errorMessage: null });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "目標の取得に失敗しました";
        setLoadState({ status: "error", goals: null, errorMessage: message });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // 保存に成功すると解決済みの目標貯蓄額・使える総額を含むgoalsが返るため、
  // 再取得せずそのままローカルの状態を差し替える
  const saveGoals = async (params: UpdateGoalsParams) => {
    setSaveState({ status: "loading", errorMessage: null });

    try {
      const data = await runScript<UpdateGoalsResponse>("handleUpdateGoals", params);

      if (!data.success || !data.goals) {
        setSaveState({ status: "error", errorMessage: data.error ?? "目標の保存に失敗しました" });
        return false;
      }

      const savedGoals = data.goals;
      setLoadState((s) => ({ ...s, goals: savedGoals }));
      setSaveState({ status: "success", errorMessage: null });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "目標の保存に失敗しました";
      setSaveState({ status: "error", errorMessage: message });
      return false;
    }
  };

  return { ...loadState, saveState, saveGoals };
}
