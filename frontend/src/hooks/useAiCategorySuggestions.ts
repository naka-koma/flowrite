import { useState } from "react";
import type {
  AiCategorySuggestion,
  AiCategorySuggestionParams,
  AiCategorySuggestionsResponse,
  ApplyAiCategorySuggestionsParams,
  ApplyAiCategorySuggestionsResponse,
} from "../types/api";
import { runScript } from "../lib/googleScriptRun";

type FetchStatus = "idle" | "loading" | "success" | "error";
type ApplyStatus = "idle" | "loading" | "success" | "error";

interface FetchState {
  status: FetchStatus;
  suggestions: AiCategorySuggestion[];
  targetCount: number;
  errorMessage: string | null;
}

interface ApplyState {
  status: ApplyStatus;
  applied: number;
  notFound: number;
  errorMessage: string | null;
}

const INITIAL_FETCH_STATE: FetchState = {
  status: "idle",
  suggestions: [],
  targetCount: 0,
  errorMessage: null,
};

const INITIAL_APPLY_STATE: ApplyState = {
  status: "idle",
  applied: 0,
  notFound: 0,
  errorMessage: null,
};

export function useAiCategorySuggestions() {
  const [state, setState] = useState<FetchState>(INITIAL_FETCH_STATE);
  const [applyState, setApplyState] = useState<ApplyState>(INITIAL_APPLY_STATE);

  const fetchSuggestions = async (params: AiCategorySuggestionParams) => {
    setState({ ...INITIAL_FETCH_STATE, status: "loading" });

    try {
      const data = await runScript<AiCategorySuggestionsResponse>("handleGetAiCategorySuggestions", params);

      if (!data.success) {
        setState({ ...INITIAL_FETCH_STATE, status: "error", errorMessage: data.error ?? "提案の取得に失敗しました" });
        return false;
      }

      setState({ status: "success", suggestions: data.suggestions, targetCount: data.targetCount, errorMessage: null });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "提案の取得に失敗しました";
      setState({ ...INITIAL_FETCH_STATE, status: "error", errorMessage: message });
      return false;
    }
  };

  const applySuggestions = async (selected: ApplyAiCategorySuggestionsParams["suggestions"]) => {
    setApplyState({ ...INITIAL_APPLY_STATE, status: "loading" });

    try {
      const data = await runScript<ApplyAiCategorySuggestionsResponse>("handleApplyAiCategorySuggestions", {
        suggestions: selected,
      });

      if (!data.success) {
        setApplyState({ ...INITIAL_APPLY_STATE, status: "error", errorMessage: data.error ?? "提案の適用に失敗しました" });
        return false;
      }

      setApplyState({ status: "success", applied: data.applied, notFound: data.notFound, errorMessage: null });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "提案の適用に失敗しました";
      setApplyState({ ...INITIAL_APPLY_STATE, status: "error", errorMessage: message });
      return false;
    }
  };

  const reset = () => {
    setState(INITIAL_FETCH_STATE);
    setApplyState(INITIAL_APPLY_STATE);
  };

  return { ...state, applyState, fetchSuggestions, applySuggestions, reset };
}
