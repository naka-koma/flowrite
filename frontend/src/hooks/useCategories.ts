import { useEffect, useState } from "react";
import type {
  AddCategoryParams,
  AddCategoryResponse,
  CategoryMaster,
  DeleteCategoryParams,
  DeleteCategoryPairParams,
  DeleteCategoryPairResponse,
  DeleteCategoryResponse,
  GetCategoriesResponse,
  RenameCategoryParams,
  RenameCategoryResponse,
  UpdateCategoryPairParams,
  UpdateCategoryPairResponse,
} from "../types/api";
import { runScript } from "../lib/googleScriptRun";

type LoadStatus = "loading" | "success" | "error";
type MutateStatus = "idle" | "loading" | "success" | "error";

// (category, subcategory)にはサーバー側の一意なIDがないため、
// インライン編集時の安定したReact keyとしてフロントエンド内でのみ使うlocalIdを付与する
export interface CategoryPairRow {
  localId: string;
  category: string;
  subcategory: string;
}

interface LoadState {
  status: LoadStatus;
  pairs: CategoryPairRow[];
  errorMessage: string | null;
}

interface MutateState {
  status: MutateStatus;
  errorMessage: string | null;
}

function flattenCategories(categories: CategoryMaster): CategoryPairRow[] {
  const pairs: CategoryPairRow[] = [];
  for (const [category, subcategories] of Object.entries(categories)) {
    for (const subcategory of subcategories) {
      pairs.push({ localId: crypto.randomUUID(), category, subcategory });
    }
  }
  return pairs;
}

function toCategoryMaster(pairs: CategoryPairRow[]): CategoryMaster {
  const master: CategoryMaster = {};
  for (const { category, subcategory } of pairs) {
    if (!master[category]) {
      master[category] = [];
    }
    if (!master[category].includes(subcategory)) {
      master[category].push(subcategory);
    }
  }
  return master;
}

export function useCategories() {
  const [loadState, setLoadState] = useState<LoadState>({
    status: "loading",
    pairs: [],
    errorMessage: null,
  });
  const [mutateState, setMutateState] = useState<MutateState>({ status: "idle", errorMessage: null });

  useEffect(() => {
    let cancelled = false;

    runScript<GetCategoriesResponse>("handleGetCategories")
      .then((data) => {
        if (cancelled) return;

        if (data.error) {
          setLoadState({ status: "error", pairs: [], errorMessage: data.error });
          return;
        }

        setLoadState({ status: "success", pairs: flattenCategories(data.categories), errorMessage: null });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "カテゴリの取得に失敗しました";
        setLoadState({ status: "error", pairs: [], errorMessage: message });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // 追加はローカルに1件増やすだけでよい（サーバー側の状態と齟齬が出ないよう既存ペアとの重複はスキップする）
  const addCategory = async (params: AddCategoryParams) => {
    setMutateState({ status: "loading", errorMessage: null });

    try {
      const data = await runScript<AddCategoryResponse>("handleAddCategory", params);

      if (!data.success) {
        setMutateState({ status: "error", errorMessage: data.error ?? "カテゴリの追加に失敗しました" });
        return false;
      }

      setLoadState((s) => {
        const exists = s.pairs.some((p) => p.category === params.category && p.subcategory === params.subcategory);
        if (exists) return s;
        return {
          ...s,
          pairs: [...s.pairs, { localId: crypto.randomUUID(), category: params.category, subcategory: params.subcategory }],
        };
      });
      setMutateState({ status: "success", errorMessage: null });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "カテゴリの追加に失敗しました";
      setMutateState({ status: "error", errorMessage: message });
      return false;
    }
  };

  // ペア単位の更新。該当行のみをローカルに反映し、失敗時は元に戻す
  const updateCategoryPair = async (params: UpdateCategoryPairParams) => {
    const previous = loadState.pairs;
    const optimistic = previous.map((p) =>
      p.category === params.oldCategory && p.subcategory === params.oldSubcategory
        ? { ...p, category: params.newCategory, subcategory: params.newSubcategory }
        : p,
    );
    setLoadState((s) => ({ ...s, pairs: optimistic }));
    setMutateState({ status: "loading", errorMessage: null });

    try {
      const data = await runScript<UpdateCategoryPairResponse>("handleUpdateCategoryPair", params);

      if (!data.success) {
        setLoadState((s) => ({ ...s, pairs: previous }));
        setMutateState({ status: "error", errorMessage: data.error ?? "カテゴリの更新に失敗しました" });
        return false;
      }

      setMutateState({ status: "success", errorMessage: null });
      return true;
    } catch (error) {
      setLoadState((s) => ({ ...s, pairs: previous }));
      const message = error instanceof Error ? error.message : "カテゴリの更新に失敗しました";
      setMutateState({ status: "error", errorMessage: message });
      return false;
    }
  };

  // ペア単位の削除。該当行のみをローカルから取り除き、失敗時は元に戻す
  const deleteCategoryPair = async (params: DeleteCategoryPairParams) => {
    const previous = loadState.pairs;
    setLoadState((s) => ({
      ...s,
      pairs: s.pairs.filter((p) => !(p.category === params.category && p.subcategory === params.subcategory)),
    }));

    try {
      const data = await runScript<DeleteCategoryPairResponse>("handleDeleteCategoryPair", params);

      if (!data.success) {
        setLoadState((s) => ({ ...s, pairs: previous }));
        setMutateState({ status: "error", errorMessage: data.error ?? "カテゴリの削除に失敗しました" });
        return false;
      }

      setMutateState({ status: "success", errorMessage: null });
      return true;
    } catch (error) {
      setLoadState((s) => ({ ...s, pairs: previous }));
      const message = error instanceof Error ? error.message : "カテゴリの削除に失敗しました";
      setMutateState({ status: "error", errorMessage: message });
      return false;
    }
  };

  // 大項目単位の一括リネーム。同じ大項目を持つ全行をローカルでも一括更新する
  const renameCategory = async (params: RenameCategoryParams) => {
    const previous = loadState.pairs;
    const optimistic = previous.map((p) => (p.category === params.oldCategory ? { ...p, category: params.newCategory } : p));
    setLoadState((s) => ({ ...s, pairs: optimistic }));
    setMutateState({ status: "loading", errorMessage: null });

    try {
      const data = await runScript<RenameCategoryResponse>("handleRenameCategory", params);

      if (!data.success) {
        setLoadState((s) => ({ ...s, pairs: previous }));
        setMutateState({ status: "error", errorMessage: data.error ?? "カテゴリ名の変更に失敗しました" });
        return false;
      }

      setMutateState({ status: "success", errorMessage: null });
      return true;
    } catch (error) {
      setLoadState((s) => ({ ...s, pairs: previous }));
      const message = error instanceof Error ? error.message : "カテゴリ名の変更に失敗しました";
      setMutateState({ status: "error", errorMessage: message });
      return false;
    }
  };

  // 大項目単位の一括削除。同じ大項目を持つ全行をローカルからも取り除く
  const deleteCategory = async (params: DeleteCategoryParams) => {
    const previous = loadState.pairs;
    setLoadState((s) => ({ ...s, pairs: s.pairs.filter((p) => p.category !== params.category) }));

    try {
      const data = await runScript<DeleteCategoryResponse>("handleDeleteCategory", params);

      if (!data.success) {
        setLoadState((s) => ({ ...s, pairs: previous }));
        setMutateState({ status: "error", errorMessage: data.error ?? "カテゴリの削除に失敗しました" });
        return false;
      }

      setMutateState({ status: "success", errorMessage: null });
      return true;
    } catch (error) {
      setLoadState((s) => ({ ...s, pairs: previous }));
      const message = error instanceof Error ? error.message : "カテゴリの削除に失敗しました";
      setMutateState({ status: "error", errorMessage: message });
      return false;
    }
  };

  return {
    status: loadState.status,
    pairs: loadState.pairs,
    categories: toCategoryMaster(loadState.pairs),
    errorMessage: loadState.errorMessage,
    mutateState,
    // TransactionScreenが既存の名前で参照しているため、mutateStateへのエイリアスとして残す
    addState: mutateState,
    addCategory,
    updateCategoryPair,
    deleteCategoryPair,
    renameCategory,
    deleteCategory,
  };
}
