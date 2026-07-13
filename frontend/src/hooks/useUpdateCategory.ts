import { useState } from "react";
import type { UpdateCategoryParams, UpdateCategoryResponse } from "../types/api";
import { runScript } from "../lib/googleScriptRun";

type UpdateStatus = "idle" | "loading" | "success" | "error";

interface UpdateState {
  status: UpdateStatus;
  errorMessage: string | null;
}

export function useUpdateCategory() {
  const [updateState, setUpdateState] = useState<UpdateState>({ status: "idle", errorMessage: null });

  const updateCategory = async (params: UpdateCategoryParams) => {
    setUpdateState({ status: "loading", errorMessage: null });

    try {
      const data = await runScript<UpdateCategoryResponse>("handleUpdateCategory", params);

      if (!data.success) {
        setUpdateState({ status: "error", errorMessage: data.error ?? "カテゴリの更新に失敗しました" });
        return false;
      }

      setUpdateState({ status: "success", errorMessage: null });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "カテゴリの更新に失敗しました";
      setUpdateState({ status: "error", errorMessage: message });
      return false;
    }
  };

  return { updateState, updateCategory };
}
