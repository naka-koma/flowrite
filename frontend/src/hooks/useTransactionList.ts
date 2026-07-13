import { useEffect, useRef, useState } from "react";
import type { TransactionListResponse, TransactionRow } from "../types/api";
import { runScript } from "../lib/googleScriptRun";

type TransactionListStatus = "loading" | "success" | "error";

export type TransactionPageSize = 10 | 25 | 50 | 100 | "all";

interface UseTransactionListParams {
  year: number;
  month: number;
  pageSize: TransactionPageSize;
  page: number;
}

// 「すべて」モード時にバックエンドへ問い合わせる際の内部チャンクサイズ
const ALL_MODE_CHUNK_SIZE = 50;

interface TransactionListState {
  status: TransactionListStatus;
  transactions: TransactionRow[];
  totalCount: number;
  categoryOptions: string[];
  subcategoryOptionsByCategory: Record<string, string[]>;
  errorMessage: string | null;
  hasMore: boolean;
}

const INITIAL_STATE: TransactionListState = {
  status: "loading",
  transactions: [],
  totalCount: 0,
  categoryOptions: [],
  subcategoryOptionsByCategory: {},
  errorMessage: null,
  hasMore: false,
};

export function useTransactionList({ year, month, pageSize, page }: UseTransactionListParams) {
  const [state, setState] = useState<TransactionListState>(INITIAL_STATE);
  const [reloadKey, setReloadKey] = useState(0);
  const nextChunkRef = useRef(1);

  const isAllMode = pageSize === "all";
  const periodKey = `${year}-${month}-${pageSize}-${isAllMode ? "" : page}-${reloadKey}`;

  useEffect(() => {
    let cancelled = false;
    setState(INITIAL_STATE);

    const fetchSize = isAllMode ? ALL_MODE_CHUNK_SIZE : pageSize;
    const fetchPage = isAllMode ? 1 : page;

    runScript<TransactionListResponse>("handleTransactionList", {
      year,
      month,
      page: fetchPage,
      pageSize: fetchSize,
    })
      .then((data) => {
        if (cancelled) return;

        if (data.error) {
          setState({ ...INITIAL_STATE, status: "error", errorMessage: data.error });
          return;
        }

        nextChunkRef.current = fetchPage + 1;
        setState({
          status: "success",
          transactions: data.transactions,
          totalCount: data.totalCount,
          categoryOptions: data.categoryOptions,
          subcategoryOptionsByCategory: data.subcategoryOptionsByCategory,
          errorMessage: null,
          hasMore: isAllMode && data.transactions.length < data.totalCount,
        });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "取引一覧の取得に失敗しました";
        setState({ ...INITIAL_STATE, status: "error", errorMessage: message });
      });

    return () => {
      cancelled = true;
    };
  }, [periodKey]);

  const loadMore = () => {
    if (!isAllMode || state.status === "loading" || !state.hasMore) return;

    const nextPage = nextChunkRef.current;
    setState((s) => ({ ...s, status: "loading" }));

    runScript<TransactionListResponse>("handleTransactionList", {
      year,
      month,
      page: nextPage,
      pageSize: ALL_MODE_CHUNK_SIZE,
    })
      .then((data) => {
        if (data.error) {
          setState((s) => ({ ...s, status: "error", errorMessage: data.error ?? null }));
          return;
        }

        nextChunkRef.current = nextPage + 1;
        setState((s) => {
          const transactions = [...s.transactions, ...data.transactions];
          return {
            status: "success",
            transactions,
            totalCount: data.totalCount,
            categoryOptions: data.categoryOptions,
            subcategoryOptionsByCategory: data.subcategoryOptionsByCategory,
            errorMessage: null,
            hasMore: transactions.length < data.totalCount,
          };
        });
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "取引一覧の取得に失敗しました";
        setState((s) => ({ ...s, status: "error", errorMessage: message }));
      });
  };

  const reload = () => setReloadKey((k) => k + 1);

  const updateLocalTransaction = (id: string, patch: Partial<TransactionRow>) => {
    setState((s) => ({
      ...s,
      transactions: s.transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }));
  };

  return { ...state, reload, loadMore, updateLocalTransaction };
}
