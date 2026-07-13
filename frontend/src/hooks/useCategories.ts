import { useEffect, useState } from "react";
import type { AddCategoryParams, AddCategoryResponse, CategoryMaster, GetCategoriesResponse } from "../types/api";
import { runScript } from "../lib/googleScriptRun";

type LoadStatus = "loading" | "success" | "error";
type AddStatus = "idle" | "loading" | "success" | "error";

interface LoadState {
  status: LoadStatus;
  categories: CategoryMaster;
  errorMessage: string | null;
}

interface AddState {
  status: AddStatus;
  errorMessage: string | null;
}

export function useCategories() {
  const [loadState, setLoadState] = useState<LoadState>({
    status: "loading",
    categories: {},
    errorMessage: null,
  });
  const [addState, setAddState] = useState<AddState>({ status: "idle", errorMessage: null });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoadState((s) => ({ ...s, status: "loading" }));

    runScript<GetCategoriesResponse>("handleGetCategories")
      .then((data) => {
        if (cancelled) return;

        if (data.error) {
          setLoadState({ status: "error", categories: {}, errorMessage: data.error });
          return;
        }

        setLoadState({ status: "success", categories: data.categories, errorMessage: null });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "カテゴリの取得に失敗しました";
        setLoadState({ status: "error", categories: {}, errorMessage: message });
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const addCategory = async (params: AddCategoryParams) => {
    setAddState({ status: "loading", errorMessage: null });

    try {
      const data = await runScript<AddCategoryResponse>("handleAddCategory", params);

      if (!data.success) {
        setAddState({ status: "error", errorMessage: data.error ?? "カテゴリの追加に失敗しました" });
        return false;
      }

      setAddState({ status: "success", errorMessage: null });
      setReloadKey((k) => k + 1);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "カテゴリの追加に失敗しました";
      setAddState({ status: "error", errorMessage: message });
      return false;
    }
  };

  return { ...loadState, addState, addCategory };
}
