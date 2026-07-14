import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Budget,
  DeleteBudgetParams,
  DeleteBudgetResponse,
  GetBudgetsResponse,
  UpsertBudgetParams,
  UpsertBudgetResponse,
} from "../types/api";
import { runScript } from "../lib/googleScriptRun";

const BUDGETS_QUERY_KEY = ["budgets"] as const;

type LoadStatus = "loading" | "success" | "error";
type MutateStatus = "idle" | "loading" | "success" | "error";

interface MutateState {
  status: MutateStatus;
  errorMessage: string | null;
}

async function fetchBudgets(): Promise<Budget[]> {
  const data = await runScript<GetBudgetsResponse>("handleGetBudgets");
  if (data.error) {
    throw new Error(data.error);
  }
  return data.budgets;
}

function errorMessageOf(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function useBudgets() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: BUDGETS_QUERY_KEY,
    queryFn: fetchBudgets,
  });

  // 追加・更新は同じhandleUpsertBudgetで扱う。onMutateでローカルを即座に反映し、
  // 失敗時はonErrorで元に戻す（既存のuseState実装と同じ楽観的更新パターン）
  const upsertMutation = useMutation({
    mutationFn: async (params: UpsertBudgetParams) => {
      const data = await runScript<UpsertBudgetResponse>("handleUpsertBudget", params);
      if (!data.success) {
        throw new Error(data.error ?? "予算の保存に失敗しました");
      }
      return data;
    },
    onMutate: async (params) => {
      await queryClient.cancelQueries({ queryKey: BUDGETS_QUERY_KEY });
      const previous = queryClient.getQueryData<Budget[]>(BUDGETS_QUERY_KEY);

      queryClient.setQueryData<Budget[]>(BUDGETS_QUERY_KEY, (old = []) => {
        const existingIndex = old.findIndex((b) => b.category === params.category);
        const optimisticBudget: Budget = { category: params.category, monthlyBudget: params.monthlyBudget };
        return existingIndex === -1
          ? [...old, optimisticBudget]
          : old.map((b) => (b.category === params.category ? optimisticBudget : b));
      });

      return { previous };
    },
    onError: (_error, _params, context) => {
      if (context?.previous) {
        queryClient.setQueryData(BUDGETS_QUERY_KEY, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: BUDGETS_QUERY_KEY });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (params: DeleteBudgetParams) => {
      const data = await runScript<DeleteBudgetResponse>("handleDeleteBudget", params);
      if (!data.success) {
        throw new Error(data.error ?? "予算の削除に失敗しました");
      }
      return data;
    },
    onMutate: async (params) => {
      await queryClient.cancelQueries({ queryKey: BUDGETS_QUERY_KEY });
      const previous = queryClient.getQueryData<Budget[]>(BUDGETS_QUERY_KEY);

      queryClient.setQueryData<Budget[]>(BUDGETS_QUERY_KEY, (old = []) =>
        old.filter((b) => b.category !== params.category),
      );

      return { previous };
    },
    onError: (_error, _params, context) => {
      if (context?.previous) {
        queryClient.setQueryData(BUDGETS_QUERY_KEY, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: BUDGETS_QUERY_KEY });
    },
  });

  const upsertBudget = async (params: UpsertBudgetParams) => {
    try {
      await upsertMutation.mutateAsync(params);
      return true;
    } catch {
      return false;
    }
  };

  const deleteBudget = async (params: DeleteBudgetParams) => {
    try {
      await deleteMutation.mutateAsync(params);
      return true;
    } catch {
      return false;
    }
  };

  const status: LoadStatus = query.isPending ? "loading" : query.isError ? "error" : "success";
  const errorMessage = query.isError ? errorMessageOf(query.error, "予算の取得に失敗しました") : null;

  let mutateState: MutateState = { status: "idle", errorMessage: null };
  if (upsertMutation.isPending || deleteMutation.isPending) {
    mutateState = { status: "loading", errorMessage: null };
  } else if (upsertMutation.isError) {
    mutateState = { status: "error", errorMessage: errorMessageOf(upsertMutation.error, "予算の保存に失敗しました") };
  } else if (deleteMutation.isError) {
    mutateState = { status: "error", errorMessage: errorMessageOf(deleteMutation.error, "予算の削除に失敗しました") };
  } else if (upsertMutation.isSuccess || deleteMutation.isSuccess) {
    mutateState = { status: "success", errorMessage: null };
  }

  return {
    status,
    budgets: query.data ?? [],
    errorMessage,
    mutateState,
    upsertBudget,
    deleteBudget,
  };
}
