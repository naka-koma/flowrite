import { useEffect, useOptimistic, useState, useTransition } from "react";
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
  // 「真実のデータ」を書き換えた時刻。連続更新時、古いレスポンスが新しい
  // リクエストの結果を上書きしてしまう（先祖返り）のを防ぐガードに使う
  updatedAt: number;
}

interface MutateState {
  status: MutateStatus;
  errorMessage: string | null;
}

type OptimisticAction = { type: "upsert"; category: string; monthlyBudget: number } | { type: "delete"; category: string };

function applyOptimisticAction(current: Budget[], action: OptimisticAction): Budget[] {
  if (action.type === "delete") {
    return current.filter((b) => b.category !== action.category);
  }

  const existingIndex = current.findIndex((b) => b.category === action.category);
  const optimisticBudget: Budget = { category: action.category, monthlyBudget: action.monthlyBudget };
  return existingIndex === -1
    ? [...current, optimisticBudget]
    : current.map((b) => (b.category === action.category ? optimisticBudget : b));
}

// startTransition内の非同期処理の完了をPromiseとして呼び出し元に返すためのヘルパー。
// useOptimisticの更新はtransition内で行う必要があるため、この形にラップする
function runInTransition<T>(
  startTransition: (callback: () => Promise<void> | void) => void,
  task: () => Promise<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    startTransition(async () => {
      try {
        resolve(await task());
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  });
}

export function useBudgets() {
  const [loadState, setLoadState] = useState<LoadState>({
    status: "loading",
    budgets: [],
    errorMessage: null,
    updatedAt: 0,
  });
  const [mutateState, setMutateState] = useState<MutateState>({ status: "idle", errorMessage: null });
  const [, startTransition] = useTransition();
  const [optimisticBudgets, dispatchOptimistic] = useOptimistic(loadState.budgets, applyOptimisticAction);

  useEffect(() => {
    let cancelled = false;

    runScript<GetBudgetsResponse>("handleGetBudgets")
      .then((data) => {
        if (cancelled) return;

        if (data.error) {
          setLoadState({ status: "error", budgets: [], errorMessage: data.error, updatedAt: Date.now() });
          return;
        }

        setLoadState({ status: "success", budgets: data.budgets, errorMessage: null, updatedAt: Date.now() });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "予算の取得に失敗しました";
        setLoadState({ status: "error", budgets: [], errorMessage: message, updatedAt: Date.now() });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // 追加・更新は同じhandleUpsertBudgetで扱う。dispatchOptimisticで即座に反映し、
  // 失敗時（または更新前に発生したエラー）は、setLoadStateを呼ばないことで
  // transition終了時に自動的にロールバックされる（useOptimisticの標準動作）
  const upsertBudget = (params: UpsertBudgetParams): Promise<boolean> =>
    runInTransition(startTransition, async () => {
      const requestTime = Date.now();
      dispatchOptimistic({ type: "upsert", category: params.category, monthlyBudget: params.monthlyBudget });
      setMutateState({ status: "loading", errorMessage: null });

      try {
        const data = await runScript<UpsertBudgetResponse>("handleUpsertBudget", params);

        if (!data.success) {
          setMutateState({ status: "error", errorMessage: data.error ?? "予算の保存に失敗しました" });
          return false;
        }

        setLoadState((current) => {
          // 自分より新しいリクエストが既に「真実のデータ」を書き換えていたら、古い結果は捨てる
          if (current.updatedAt > requestTime) {
            return current;
          }
          return {
            status: "success",
            budgets: applyOptimisticAction(current.budgets, {
              type: "upsert",
              category: params.category,
              monthlyBudget: params.monthlyBudget,
            }),
            errorMessage: null,
            updatedAt: requestTime,
          };
        });

        setMutateState({ status: "success", errorMessage: null });
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "予算の保存に失敗しました";
        setMutateState({ status: "error", errorMessage: message });
        return false;
      }
    });

  const deleteBudget = (params: DeleteBudgetParams): Promise<boolean> =>
    runInTransition(startTransition, async () => {
      const requestTime = Date.now();
      dispatchOptimistic({ type: "delete", category: params.category });

      try {
        const data = await runScript<DeleteBudgetResponse>("handleDeleteBudget", params);

        if (!data.success) {
          setMutateState({ status: "error", errorMessage: data.error ?? "予算の削除に失敗しました" });
          return false;
        }

        setLoadState((current) => {
          if (current.updatedAt > requestTime) {
            return current;
          }
          return {
            status: "success",
            budgets: applyOptimisticAction(current.budgets, { type: "delete", category: params.category }),
            errorMessage: null,
            updatedAt: requestTime,
          };
        });

        setMutateState({ status: "success", errorMessage: null });
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "予算の削除に失敗しました";
        setMutateState({ status: "error", errorMessage: message });
        return false;
      }
    });

  return {
    status: loadState.status,
    budgets: optimisticBudgets,
    errorMessage: loadState.errorMessage,
    mutateState,
    upsertBudget,
    deleteBudget,
  };
}
