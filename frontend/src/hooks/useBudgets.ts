import { useEffect, useState } from "react";
import type {
  Budget,
  DeleteBudgetParams,
  DeleteBudgetResponse,
  GetBudgetsResponse,
  UpsertBudgetParams,
  UpsertBudgetResponse,
} from "../types/api";
import { runScript } from "../lib/googleScriptRun";

type LoadStatus = "loading" | "success" | "error";
type MutateStatus = "idle" | "loading" | "success" | "error";

interface LoadState {
  status: LoadStatus;
  budgets: Budget[];
  errorMessage: string | null;
}

interface MutateState {
  status: MutateStatus;
  errorMessage: string | null;
}

export function useBudgets() {
  const [loadState, setLoadState] = useState<LoadState>({
    status: "loading",
    budgets: [],
    errorMessage: null,
  });
  const [mutateState, setMutateState] = useState<MutateState>({ status: "idle", errorMessage: null });

  useEffect(() => {
    let cancelled = false;

    runScript<GetBudgetsResponse>("handleGetBudgets")
      .then((data) => {
        if (cancelled) return;

        if (data.error) {
          setLoadState({ status: "error", budgets: [], errorMessage: data.error });
          return;
        }

        setLoadState({ status: "success", budgets: data.budgets, errorMessage: null });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "予算の取得に失敗しました";
        setLoadState({ status: "error", budgets: [], errorMessage: message });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // 追加・更新は同じhandleUpsertBudgetで扱う。ローカルを即座に反映し、失敗時のみ元に戻す
  const upsertBudget = async (params: UpsertBudgetParams) => {
    const previous = loadState.budgets;
    const existingIndex = previous.findIndex((b) => b.category === params.category);
    const optimisticBudget: Budget = { category: params.category, monthlyBudget: params.monthlyBudget };
    const optimisticBudgets =
      existingIndex === -1
        ? [...previous, optimisticBudget]
        : previous.map((b) => (b.category === params.category ? optimisticBudget : b));

    setMutateState({ status: "loading", errorMessage: null });
    setLoadState((s) => ({ ...s, budgets: optimisticBudgets }));

    try {
      const data = await runScript<UpsertBudgetResponse>("handleUpsertBudget", params);

      if (!data.success) {
        setLoadState((s) => ({ ...s, budgets: previous }));
        setMutateState({ status: "error", errorMessage: data.error ?? "予算の保存に失敗しました" });
        return false;
      }

      setMutateState({ status: "success", errorMessage: null });
      return true;
    } catch (error) {
      setLoadState((s) => ({ ...s, budgets: previous }));
      const message = error instanceof Error ? error.message : "予算の保存に失敗しました";
      setMutateState({ status: "error", errorMessage: message });
      return false;
    }
  };

  const deleteBudget = async (params: DeleteBudgetParams) => {
    const previous = loadState.budgets;
    setLoadState((s) => ({ ...s, budgets: s.budgets.filter((b) => b.category !== params.category) }));

    try {
      const data = await runScript<DeleteBudgetResponse>("handleDeleteBudget", params);

      if (!data.success) {
        setLoadState((s) => ({ ...s, budgets: previous }));
        setMutateState({ status: "error", errorMessage: data.error ?? "予算の削除に失敗しました" });
        return false;
      }

      setMutateState({ status: "success", errorMessage: null });
      return true;
    } catch (error) {
      setLoadState((s) => ({ ...s, budgets: previous }));
      const message = error instanceof Error ? error.message : "予算の削除に失敗しました";
      setMutateState({ status: "error", errorMessage: message });
      return false;
    }
  };

  return { ...loadState, mutateState, upsertBudget, deleteBudget };
}
