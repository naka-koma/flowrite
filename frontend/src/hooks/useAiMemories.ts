import { useEffect, useState } from "react";
import type {
  AddAiMemoryParams,
  AddAiMemoryResponse,
  AiMemory,
  ConsolidateAiMemoryInsightsResponse,
  DeleteAiMemoryParams,
  DeleteAiMemoryResponse,
  GetAiMemoriesResponse,
  SummarizeAiInsightResponse,
} from "../types/api";
import { runScript } from "../lib/googleScriptRun";

type LoadStatus = "loading" | "success" | "error";
type MutateStatus = "idle" | "loading" | "success" | "error";

interface LoadState {
  status: LoadStatus;
  memories: AiMemory[];
  errorMessage: string | null;
}

interface MutateState {
  status: MutateStatus;
  errorMessage: string | null;
}

export function useAiMemories() {
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading", memories: [], errorMessage: null });
  const [mutateState, setMutateState] = useState<MutateState>({ status: "idle", errorMessage: null });
  const [consolidateState, setConsolidateState] = useState<MutateState>({ status: "idle", errorMessage: null });

  useEffect(() => {
    let cancelled = false;

    runScript<GetAiMemoriesResponse>("handleGetAiMemories")
      .then((data) => {
        if (cancelled) return;

        if (data.error) {
          setLoadState({ status: "error", memories: [], errorMessage: data.error });
          return;
        }

        setLoadState({ status: "success", memories: data.memories, errorMessage: null });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "メモリの取得に失敗しました";
        setLoadState({ status: "error", memories: [], errorMessage: message });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // 追加はサーバーで採番されたidを含むメモリが返るため、成功したらローカル配列に1件追加するだけでよい
  const addMemory = async (params: AddAiMemoryParams) => {
    setMutateState({ status: "loading", errorMessage: null });

    try {
      const data = await runScript<AddAiMemoryResponse>("handleAddAiMemory", params);

      if (!data.success || !data.memory) {
        setMutateState({ status: "error", errorMessage: data.error ?? "メモリの追加に失敗しました" });
        return false;
      }

      const newMemory = data.memory;
      setLoadState((s) => ({ ...s, memories: [...s.memories, newMemory] }));
      setMutateState({ status: "success", errorMessage: null });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "メモリの追加に失敗しました";
      setMutateState({ status: "error", errorMessage: message });
      return false;
    }
  };

  // 「覚えておく」操作向け。元のAI回答テキストをまずGeminiに要約させてから保存する。
  // 要約リクエスト自体が失敗しても「覚えておく」操作は失敗させず、元テキストのまま保存する
  const addMemoryFromRawText = async (text: string) => {
    let content = text;

    try {
      const summarizeData = await runScript<SummarizeAiInsightResponse>("handleSummarizeAiInsight", { text });
      if (summarizeData.success && summarizeData.summary) {
        content = summarizeData.summary;
      }
    } catch {
      // 要約に失敗した場合は元のテキストのまま保存する
    }

    return addMemory({ type: "insight", content });
  };

  // 削除はローカルを即座に反映し、失敗時のみ元に戻す
  const deleteMemory = async (params: DeleteAiMemoryParams) => {
    const previous = loadState.memories;
    setLoadState((s) => ({ ...s, memories: s.memories.filter((m) => m.id !== params.id) }));

    try {
      const data = await runScript<DeleteAiMemoryResponse>("handleDeleteAiMemory", params);

      if (!data.success) {
        setLoadState((s) => ({ ...s, memories: previous }));
        setMutateState({ status: "error", errorMessage: data.error ?? "メモリの削除に失敗しました" });
        return false;
      }

      setMutateState({ status: "success", errorMessage: null });
      return true;
    } catch (error) {
      setLoadState((s) => ({ ...s, memories: previous }));
      const message = error instanceof Error ? error.message : "メモリの削除に失敗しました";
      setMutateState({ status: "error", errorMessage: message });
      return false;
    }
  };

  // 蓄積された気づきをAIに分析させ、重複統合・一般化した内容にまとめて置き換える
  const consolidateInsights = async () => {
    setConsolidateState({ status: "loading", errorMessage: null });

    try {
      const data = await runScript<ConsolidateAiMemoryInsightsResponse>("handleConsolidateAiMemoryInsights");

      if (!data.success || !data.memories) {
        setConsolidateState({ status: "error", errorMessage: data.error ?? "メモリの整理に失敗しました" });
        return false;
      }

      setLoadState((s) => ({ ...s, memories: data.memories as AiMemory[] }));
      setConsolidateState({ status: "success", errorMessage: null });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "メモリの整理に失敗しました";
      setConsolidateState({ status: "error", errorMessage: message });
      return false;
    }
  };

  return { ...loadState, mutateState, addMemory, addMemoryFromRawText, deleteMemory, consolidateState, consolidateInsights };
}
