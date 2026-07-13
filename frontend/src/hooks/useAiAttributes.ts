import { useEffect, useState } from "react";
import type {
  AiAttribute,
  DeleteAiAttributeParams,
  DeleteAiAttributeResponse,
  GetAiAttributesResponse,
  UpsertAiAttributeParams,
  UpsertAiAttributeResponse,
} from "../types/api";
import { runScript } from "../lib/googleScriptRun";

type LoadStatus = "loading" | "success" | "error";
type MutateStatus = "idle" | "loading" | "success" | "error";

interface LoadState {
  status: LoadStatus;
  attributes: AiAttribute[];
  errorMessage: string | null;
}

interface MutateState {
  status: MutateStatus;
  errorMessage: string | null;
}

export function useAiAttributes() {
  const [loadState, setLoadState] = useState<LoadState>({
    status: "loading",
    attributes: [],
    errorMessage: null,
  });
  const [mutateState, setMutateState] = useState<MutateState>({ status: "idle", errorMessage: null });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoadState((s) => ({ ...s, status: "loading" }));

    runScript<GetAiAttributesResponse>("handleGetAiAttributes")
      .then((data) => {
        if (cancelled) return;

        if (data.error) {
          setLoadState({ status: "error", attributes: [], errorMessage: data.error });
          return;
        }

        setLoadState({ status: "success", attributes: data.attributes, errorMessage: null });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "属性情報の取得に失敗しました";
        setLoadState({ status: "error", attributes: [], errorMessage: message });
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const upsertAttribute = async (params: UpsertAiAttributeParams) => {
    setMutateState({ status: "loading", errorMessage: null });

    try {
      const data = await runScript<UpsertAiAttributeResponse>("handleUpsertAiAttribute", params);

      if (!data.success) {
        setMutateState({ status: "error", errorMessage: data.error ?? "属性情報の保存に失敗しました" });
        return false;
      }

      setMutateState({ status: "success", errorMessage: null });
      setReloadKey((k) => k + 1);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "属性情報の保存に失敗しました";
      setMutateState({ status: "error", errorMessage: message });
      return false;
    }
  };

  const deleteAttribute = async (params: DeleteAiAttributeParams) => {
    setMutateState({ status: "loading", errorMessage: null });

    try {
      const data = await runScript<DeleteAiAttributeResponse>("handleDeleteAiAttribute", params);

      if (!data.success) {
        setMutateState({ status: "error", errorMessage: data.error ?? "属性情報の削除に失敗しました" });
        return false;
      }

      setMutateState({ status: "success", errorMessage: null });
      setReloadKey((k) => k + 1);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "属性情報の削除に失敗しました";
      setMutateState({ status: "error", errorMessage: message });
      return false;
    }
  };

  return { ...loadState, mutateState, upsertAttribute, deleteAttribute };
}
