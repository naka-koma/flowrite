import { useEffect, useState } from "react";
import type {
  AddCategoryParams,
  AddCategoryResponse,
  CategoryMaster,
  DeleteCategoryParams,
  DeleteCategoryResponse,
  GetCategoriesResponse,
  RenameCategoryParams,
  RenameCategoryResponse,
} from "../types/api";
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

  // リネーム・削除は大項目単位で構造が変わる（キーの追加・削除）ため、
  // 楽観的更新ではなく再取得で反映する
  const renameCategory = async (params: RenameCategoryParams) => {
    setAddState({ status: "loading", errorMessage: null });

    try {
      const data = await runScript<RenameCategoryResponse>("handleRenameCategory", params);

      if (!data.success) {
        setAddState({ status: "error", errorMessage: data.error ?? "カテゴリ名の変更に失敗しました" });
        return false;
      }

      setAddState({ status: "success", errorMessage: null });
      setReloadKey((k) => k + 1);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "カテゴリ名の変更に失敗しました";
      setAddState({ status: "error", errorMessage: message });
      return false;
    }
  };

  const deleteCategory = async (params: DeleteCategoryParams) => {
    setAddState({ status: "loading", errorMessage: null });

    try {
      const data = await runScript<DeleteCategoryResponse>("handleDeleteCategory", params);

      if (!data.success) {
        setAddState({ status: "error", errorMessage: data.error ?? "カテゴリの削除に失敗しました" });
        return false;
      }

      setAddState({ status: "success", errorMessage: null });
      setReloadKey((k) => k + 1);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "カテゴリの削除に失敗しました";
      setAddState({ status: "error", errorMessage: message });
      return false;
    }
  };

  return { ...loadState, addState, addCategory, renameCategory, deleteCategory };
}
