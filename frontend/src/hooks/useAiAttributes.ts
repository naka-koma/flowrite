import { useEffect, useState } from "react";
import type {
  AddAiAttributeParams,
  AddAiAttributeResponse,
  AiAttribute,
  DeleteAiAttributeParams,
  DeleteAiAttributeResponse,
  GetAiAttributesResponse,
  UpdateAiAttributeParams,
  UpdateAiAttributeResponse,
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

  useEffect(() => {
    let cancelled = false;

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
  }, []);

  // 追加はサーバーで採番されたidを含む属性が返るため、成功したらローカル配列に1件追加するだけでよい
  const addAttribute = async (params: AddAiAttributeParams) => {
    setMutateState({ status: "loading", errorMessage: null });

    try {
      const data = await runScript<AddAiAttributeResponse>("handleAddAiAttribute", params);

      if (!data.success || !data.attribute) {
        setMutateState({ status: "error", errorMessage: data.error ?? "属性情報の追加に失敗しました" });
        return false;
      }

      const newAttribute = data.attribute;
      setLoadState((s) => ({ ...s, attributes: [...s.attributes, newAttribute] }));
      setMutateState({ status: "success", errorMessage: null });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "属性情報の追加に失敗しました";
      setMutateState({ status: "error", errorMessage: message });
      return false;
    }
  };

  // 更新はローカルを即座に反映し、失敗時のみ元の値に戻す（一覧全体の再取得は行わない）
  const updateAttribute = async (params: UpdateAiAttributeParams) => {
    const previous = loadState.attributes.find((a) => a.id === params.id);

    setLoadState((s) => ({
      ...s,
      attributes: s.attributes.map((a) => (a.id === params.id ? { ...a, key: params.key, value: params.value } : a)),
    }));

    try {
      const data = await runScript<UpdateAiAttributeResponse>("handleUpdateAiAttribute", params);

      if (!data.success) {
        if (previous) {
          setLoadState((s) => ({ ...s, attributes: s.attributes.map((a) => (a.id === params.id ? previous : a)) }));
        }
        setMutateState({ status: "error", errorMessage: data.error ?? "属性情報の更新に失敗しました" });
        return false;
      }

      setMutateState({ status: "success", errorMessage: null });
      return true;
    } catch (error) {
      if (previous) {
        setLoadState((s) => ({ ...s, attributes: s.attributes.map((a) => (a.id === params.id ? previous : a)) }));
      }
      const message = error instanceof Error ? error.message : "属性情報の更新に失敗しました";
      setMutateState({ status: "error", errorMessage: message });
      return false;
    }
  };

  // 削除もローカルを即座に反映し、失敗時のみ元に戻す
  const deleteAttribute = async (params: DeleteAiAttributeParams) => {
    const previous = loadState.attributes;
    setLoadState((s) => ({ ...s, attributes: s.attributes.filter((a) => a.id !== params.id) }));

    try {
      const data = await runScript<DeleteAiAttributeResponse>("handleDeleteAiAttribute", params);

      if (!data.success) {
        setLoadState((s) => ({ ...s, attributes: previous }));
        setMutateState({ status: "error", errorMessage: data.error ?? "属性情報の削除に失敗しました" });
        return false;
      }

      setMutateState({ status: "success", errorMessage: null });
      return true;
    } catch (error) {
      setLoadState((s) => ({ ...s, attributes: previous }));
      const message = error instanceof Error ? error.message : "属性情報の削除に失敗しました";
      setMutateState({ status: "error", errorMessage: message });
      return false;
    }
  };

  return { ...loadState, mutateState, addAttribute, updateAttribute, deleteAttribute };
}
